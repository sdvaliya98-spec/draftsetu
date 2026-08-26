import logging
import hmac
import hashlib
import uuid
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
import razorpay
from backend import models
from backend.core.config import settings

logger = logging.getLogger("backend.services.wallet_service")

class WalletService:
    @staticmethod
    def create_wallet(db: Session, user_id: int) -> models.Wallet:
        """
        Creates a new wallet for a user.
        Raises ValueError if user already has a wallet.
        """
        existing = db.query(models.Wallet).filter(models.Wallet.user_id == user_id).first()
        if existing:
            raise ValueError("User already has a wallet.")
        
        wallet = models.Wallet(user_id=user_id, current_balance=0)
        db.add(wallet)
        db.flush()  # get wallet.id before commit
        return wallet

    @staticmethod
    def grant_signup_bonus(db: Session, user_id: int) -> models.Wallet:
        """
        Grants the signup bonus credits to a user.
        Integrates wallet creation and transaction ledger creation.
        """
        bonus_credits = settings.SIGNUP_BONUS_CREDITS
        if not settings.WALLET_ENABLED:
            bonus_credits = 0

        # Check if user already has a wallet
        existing = db.query(models.Wallet).filter(models.Wallet.user_id == user_id).first()
        if existing:
            logger.warning(f"User {user_id} already has a wallet. Signup bonus skipped.")
            return existing

        wallet = models.Wallet(user_id=user_id, current_balance=bonus_credits)
        db.add(wallet)
        db.flush()

        # Insert transaction record
        tx = models.WalletTransaction(
            wallet_id=wallet.id,
            user_id=user_id,
            type="CREDIT",
            source="SIGNUP",
            credits=bonus_credits,
            balance_after=bonus_credits,
            remarks="Signup bonus credits",
            created_at=datetime.now(timezone.utc)
        )
        db.add(tx)
        db.flush()
        logger.info(f"Granted {bonus_credits} signup bonus credits to user {user_id}.")
        return wallet

    @staticmethod
    def get_wallet(db: Session, user_id: int) -> models.Wallet:
        """
        Retrieves the wallet for a user. Creates it if missing.
        """
        wallet = db.query(models.Wallet).filter(models.Wallet.user_id == user_id).first()
        if not wallet:
            wallet = models.Wallet(user_id=user_id, current_balance=0)
            db.add(wallet)
            db.flush()
        return wallet

    @staticmethod
    def adjust_balance(db: Session, user_id: int, credits: int, type: str, source: str, remarks: str) -> models.Wallet:
        """
        Core function to modify wallet balance and record a ledger entry.
        Supports negative adjustments if type is DEBIT.
        Includes row-level locking (with_for_update) to prevent race conditions.
        """
        if credits < 0:
            raise ValueError("Credit amount must be positive.")

        # Row-level locking to prevent concurrent modifications
        wallet = db.query(models.Wallet).filter(models.Wallet.user_id == user_id).with_for_update().first()
        if not wallet:
            wallet = models.Wallet(user_id=user_id, current_balance=0)
            db.add(wallet)
            db.flush()

        old_balance = wallet.current_balance
        if type == "CREDIT":
            new_balance = old_balance + credits
        elif type == "DEBIT":
            new_balance = old_balance - credits
            if new_balance < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient wallet balance. Available: {old_balance}, Required: {credits}"
                )
        else:
            raise ValueError(f"Invalid transaction type: {type}")

        wallet.current_balance = new_balance
        wallet.updated_at = datetime.now(timezone.utc)
        db.add(wallet)

        # Create ledger history
        tx = models.WalletTransaction(
            wallet_id=wallet.id,
            user_id=user_id,
            type=type,
            source=source,
            credits=credits,
            balance_after=new_balance,
            remarks=remarks,
            created_at=datetime.now(timezone.utc)
        )
        db.add(tx)
        db.flush()

        logger.info(f"Adjusted balance for user {user_id}: {old_balance} -> {new_balance} ({type}, source: {source})")
        return wallet

    @staticmethod
    def deduct_credits(db: Session, user_id: int, cost: int, template_id: str, tracking_id: str) -> models.Wallet:
        """
        Safely check balance and deduct credits for document generation.
        Protects against double-deductions under concurrent requests.
        """
        # 1. Acquire the row lock on the wallet first to synchronize concurrent requests for this user
        wallet = db.query(models.Wallet).filter(models.Wallet.user_id == user_id).with_for_update().first()
        if not wallet:
            wallet = models.Wallet(user_id=user_id, current_balance=0)
            db.add(wallet)
            db.flush()

        # 2. Check for duplicate debit inside the lock
        existing_debit = db.query(models.WalletTransaction).filter(
            models.WalletTransaction.user_id == user_id,
            models.WalletTransaction.type == "DEBIT",
            models.WalletTransaction.source == "DOCUMENT",
            models.WalletTransaction.remarks.like(f"%{tracking_id}%")
        ).first()

        if existing_debit:
            logger.warning(f"Credits already deducted for document {tracking_id}. Skipping duplicate deduction.")
            return wallet

        # 3. Perform deduction directly
        remarks = f"Final lock for document {tracking_id} (Template: {template_id})"
        old_balance = wallet.current_balance
        new_balance = old_balance - cost
        if new_balance < 0:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient wallet balance. Available: {old_balance}, Required: {cost}"
            )

        wallet.current_balance = new_balance
        wallet.updated_at = datetime.now(timezone.utc)
        db.add(wallet)

        # Create ledger history
        tx = models.WalletTransaction(
            wallet_id=wallet.id,
            user_id=user_id,
            type="DEBIT",
            source="DOCUMENT",
            credits=cost,
            balance_after=new_balance,
            remarks=remarks,
            created_at=datetime.now(timezone.utc)
        )
        db.add(tx)
        db.flush()

        logger.info(f"Adjusted balance for user {user_id}: {old_balance} -> {new_balance} (DEBIT, source: DOCUMENT)")
        return wallet

    @staticmethod
    def migrate_existing_users(db: Session) -> dict:
        """
        Idempotent migration: Scans all users and creates wallets with 100 credits signup bonus
        for those that do not have one yet.
        Returns a summary dictionary of scanned, created, skipped, and error counts.
        """
        summary = {
            "scanned": 0,
            "created": 0,
            "skipped": 0,
            "errors": 0
        }
        
        # 1. Fetch all users
        users = db.query(models.User).all()
        summary["scanned"] = len(users)
        
        # 2. Iterate and process individually under locks/safeties
        for user in users:
            try:
                # Check for existing wallet
                existing = db.query(models.Wallet).filter(models.Wallet.user_id == user.id).first()
                if existing:
                    summary["skipped"] += 1
                    continue
                
                # Create wallet with default 100 credits
                bonus_credits = settings.SIGNUP_BONUS_CREDITS
                wallet = models.Wallet(
                    user_id=user.id,
                    current_balance=bonus_credits,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                db.add(wallet)
                db.flush()
                
                # Create WalletTransaction
                tx = models.WalletTransaction(
                    wallet_id=wallet.id,
                    user_id=user.id,
                    type="CREDIT",
                    source="MIGRATION",
                    credits=bonus_credits,
                    balance_after=bonus_credits,
                    remarks="Initial wallet migration for existing user",
                    created_at=datetime.now(timezone.utc)
                )
                db.add(tx)
                db.flush()
                summary["created"] += 1
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to migrate user {user.id}: {str(e)}")
                summary["errors"] += 1
                
        db.commit()
        return summary

    @staticmethod
    def get_plan_by_id(plan_id: str) -> dict:
        """
        Retrieves a recharge plan by its identifier from server settings.
        Raises HTTPException if not found.
        """
        for plan in settings.RECHARGE_PLANS:
            if plan.get("id") == plan_id:
                return plan
        raise HTTPException(
            status_code=400,
            detail=f"Invalid recharge plan ID: '{plan_id}'. Please select a valid plan."
        )

    @staticmethod
    def create_razorpay_order(db: Session, user: models.User, credits: int) -> dict:
        """
        Creates a Razorpay order on the backend for a custom credit amount (1 Credit = ₹1 INR).
        Strictly enforces credits >= 50 and server-side calculated pricing: amount_in_paise = credits * 100.
        Strictly requires valid Razorpay credentials. If Razorpay API call fails (e.g. auth error,
        network failure, bad request), raises HTTP 500/502 and NEVER generates fake fallback orders.
        """
        if not isinstance(credits, int) or isinstance(credits, bool) or credits < 50:
            raise HTTPException(
                status_code=400,
                detail="ઓછામાં ઓછા 50 ક્રેડિટ્સ ઉમેરવા જરૂરી છે. (Minimum recharge is 50 credits.)"
            )

        amount_in_paise = credits * 100
        amount_in_inr = credits

        # Validate that Razorpay credentials are configured
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET or settings.RAZORPAY_KEY_ID == "rzp_test_placeholder":
            logger.error("Razorpay API credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing or unconfigured.")
            raise HTTPException(
                status_code=500,
                detail="Payment gateway credentials are not configured on the server. Please contact administrator."
            )

        # Call Razorpay API to create official order
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            order_payload = {
                "amount": amount_in_paise,
                "currency": "INR",
                "receipt": f"rcpt_{uuid.uuid4().hex[:10]}",
                "notes": {
                    "user_id": str(user.id),
                    "username": user.username,
                    "plan_id": "custom",
                    "credits": str(credits)
                }
            }
            rzp_order = client.order.create(order_payload)
            order_id = rzp_order.get("id")
            if not order_id:
                logger.error(f"Razorpay API returned empty order response: {rzp_order}")
                raise HTTPException(
                    status_code=502,
                    detail="Payment gateway returned an invalid order response. Please try again."
                )
            logger.info(f"Successfully created Razorpay order {order_id} via API for user {user.id} ({credits} credits, ₹{amount_in_inr})")
        except HTTPException:
            raise
        except razorpay.errors.BadRequestError as e:
            logger.error(f"Razorpay BadRequestError for user {user.id}: {str(e)}")
            raise HTTPException(
                status_code=502,
                detail="Payment gateway rejected the order request due to invalid parameters or authentication failure."
            )
        except razorpay.errors.GatewayError as e:
            logger.error(f"Razorpay GatewayError for user {user.id}: {str(e)}")
            raise HTTPException(
                status_code=502,
                detail="Payment gateway is currently experiencing issues. Please try again later."
            )
        except razorpay.errors.ServerError as e:
            logger.error(f"Razorpay ServerError for user {user.id}: {str(e)}")
            raise HTTPException(
                status_code=502,
                detail="Payment gateway server error. Please try again later."
            )
        except Exception as e:
            # Safe logging: sanitize secret from error logs if present
            err_str = str(e)
            if settings.RAZORPAY_KEY_SECRET:
                err_str = err_str.replace(settings.RAZORPAY_KEY_SECRET, "******")
            logger.error(f"Razorpay order creation failed for user {user.id} ({type(e).__name__}): {err_str}")
            raise HTTPException(
                status_code=502,
                detail="Failed to create payment order with payment gateway. Please check gateway credentials or try again."
            )

        # Persist verified order in database
        payment_order = models.PaymentOrder(
            user_id=user.id,
            order_id=order_id,
            plan_id="custom",
            amount=amount_in_paise,
            currency="INR",
            credits=credits,
            status="CREATED",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(payment_order)
        db.commit()
        db.refresh(payment_order)

        logger.info(f"Payment order {order_id} registered in database for user {user.id} ({credits} credits, ₹{amount_in_inr}).")

        return {
            "order_id": payment_order.order_id,
            "amount": payment_order.amount,
            "currency": payment_order.currency,
            "key_id": settings.RAZORPAY_KEY_ID,
            "plan_id": "custom",
            "credits": payment_order.credits,
            "amount_in_inr": amount_in_inr,
            "plan_title": f"{credits} Credits Recharge",
            "user_name": user.username,
            "user_mobile": user.mobile_number
        }

    @staticmethod
    def verify_and_fulfill_payment(
        db: Session,
        user: models.User,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str
    ) -> dict:
        """
        Cryptographically verifies Razorpay payment signature and atomically credits
        the user's wallet. Fully idempotent: multiple calls for the same payment or order
        will not result in double crediting.
        """
        # 1. Fetch the payment order record
        payment_order = db.query(models.PaymentOrder).filter(
            models.PaymentOrder.order_id == razorpay_order_id
        ).first()

        if not payment_order:
            raise HTTPException(status_code=404, detail="Payment order not found.")

        # 2. Authorization check: user must own the order
        if payment_order.user_id != user.id:
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: You cannot verify a payment order belonging to another user."
            )

        # 3. Idempotency Check: Order already fulfilled
        if payment_order.status == "SUCCESS":
            wallet = WalletService.get_wallet(db, user.id)
            logger.info(f"Payment order {razorpay_order_id} was already fulfilled. Returning existing balance.")
            return {
                "success": True,
                "message": "Payment was already verified and credited.",
                "credits_added": payment_order.credits,
                "new_balance": wallet.current_balance,
                "already_processed": True
            }

        # 4. Idempotency Check: Payment ID already used in another order
        if razorpay_payment_id:
            existing_payment = db.query(models.PaymentOrder).filter(
                models.PaymentOrder.payment_id == razorpay_payment_id,
                models.PaymentOrder.status == "SUCCESS"
            ).first()
            if existing_payment:
                wallet = WalletService.get_wallet(db, user.id)
                logger.warning(f"Payment ID {razorpay_payment_id} was already fulfilled under order {existing_payment.order_id}.")
                return {
                    "success": True,
                    "message": "This payment has already been credited.",
                    "credits_added": existing_payment.credits,
                    "new_balance": wallet.current_balance,
                    "already_processed": True
                }

        # 5. Cryptographic Signature Verification
        key_secret = settings.RAZORPAY_KEY_SECRET
        if not key_secret:
            logger.error("RAZORPAY_KEY_SECRET is not configured on server. Cannot verify payment.")
            raise HTTPException(
                status_code=500,
                detail="Payment gateway secret is not configured on the server."
            )

        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        expected_signature = hmac.new(
            key_secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(expected_signature, razorpay_signature):
            # Mark order as failed due to signature mismatch
            payment_order.status = "FAILED"
            payment_order.payment_id = razorpay_payment_id
            payment_order.signature = razorpay_signature
            payment_order.error_code = "BAD_SIGNATURE"
            payment_order.error_description = "HMAC SHA256 signature mismatch."
            payment_order.updated_at = datetime.now(timezone.utc)
            db.add(payment_order)
            db.commit()

            logger.error(f"Signature mismatch for order {razorpay_order_id} with payment {razorpay_payment_id}")
            raise HTTPException(status_code=400, detail="Invalid payment signature. Verification failed.")

        # 6. Signature is valid: Atomic Credit Addition via WalletService.adjust_balance
        try:
            remarks = f"Razorpay Recharge: +{payment_order.credits} credits (Payment ID: {razorpay_payment_id})"
            wallet = WalletService.adjust_balance(
                db=db,
                user_id=user.id,
                credits=payment_order.credits,
                type="CREDIT",
                source="PAYMENT",
                remarks=remarks
            )

            # Get the newly created transaction
            latest_tx = db.query(models.WalletTransaction).filter(
                models.WalletTransaction.user_id == user.id,
                models.WalletTransaction.type == "CREDIT",
                models.WalletTransaction.source == "PAYMENT"
            ).order_by(models.WalletTransaction.id.desc()).first()

            # Update PaymentOrder to SUCCESS
            payment_order.status = "SUCCESS"
            payment_order.payment_id = razorpay_payment_id
            payment_order.signature = razorpay_signature
            payment_order.wallet_transaction_id = latest_tx.id if latest_tx else None
            payment_order.updated_at = datetime.now(timezone.utc)
            db.add(payment_order)
            db.commit()

            # Log system activity
            try:
                from backend.services.activity_service import log_activity
                log_activity(
                    db=db,
                    username=user.username,
                    action=f"Razorpay Recharge: +{payment_order.credits} credits (₹{payment_order.amount // 100})",
                    entity_type="wallet",
                    entity_id=str(wallet.id)
                )
            except Exception as act_err:
                logger.warning(f"Failed to log activity: {act_err}")

            logger.info(f"Payment {razorpay_payment_id} successfully verified. User {user.id} credited with {payment_order.credits} credits.")

            return {
                "success": True,
                "message": f"સફળતાપૂર્વક {payment_order.credits} ક્રેડિટ્સ તમારા વોલેટમાં ઉમેરાઈ ગઈ છે! (Successfully added {payment_order.credits} credits!)",
                "credits_added": payment_order.credits,
                "new_balance": wallet.current_balance,
                "already_processed": False
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Error fulfilling payment {razorpay_payment_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to process credit fulfillment: {str(e)}")

    @staticmethod
    def process_webhook(db: Session, payload_bytes: bytes, signature_header: str) -> dict:
        """
        Idempotent Razorpay Webhook processor.
        Verifies webhook signature using RAZORPAY_WEBHOOK_SECRET and fulfills payment if not yet processed.
        """
        webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET or settings.RAZORPAY_KEY_SECRET
        if webhook_secret and signature_header:
            expected_signature = hmac.new(
                webhook_secret.encode("utf-8"),
                payload_bytes,
                hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(expected_signature, signature_header):
                logger.error("Invalid Razorpay webhook signature.")
                raise HTTPException(status_code=400, detail="Invalid webhook signature.")

        try:
            event_data = json.loads(payload_bytes.decode("utf-8"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON webhook payload.")

        event_type = event_data.get("event")
        logger.info(f"Received Razorpay webhook event: {event_type}")

        if event_type in ["payment.captured", "order.paid"]:
            payment_entity = event_data.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            payment_id = payment_entity.get("id")

            if order_id:
                payment_order = db.query(models.PaymentOrder).filter(
                    models.PaymentOrder.order_id == order_id
                ).first()

                if payment_order and payment_order.status != "SUCCESS":
                    user = db.query(models.User).filter(models.User.id == payment_order.user_id).first()
                    if user:
                        # Atomically credit wallet
                        remarks = f"Razorpay Webhook ({event_type}): +{payment_order.credits} credits (Payment ID: {payment_id})"
                        wallet = WalletService.adjust_balance(
                            db=db,
                            user_id=user.id,
                            credits=payment_order.credits,
                            type="CREDIT",
                            source="PAYMENT",
                            remarks=remarks
                        )
                        latest_tx = db.query(models.WalletTransaction).filter(
                            models.WalletTransaction.user_id == user.id,
                            models.WalletTransaction.type == "CREDIT",
                            models.WalletTransaction.source == "PAYMENT"
                        ).order_by(models.WalletTransaction.id.desc()).first()

                        payment_order.status = "SUCCESS"
                        payment_order.payment_id = payment_id
                        payment_order.wallet_transaction_id = latest_tx.id if latest_tx else None
                        payment_order.updated_at = datetime.now(timezone.utc)
                        db.add(payment_order)
                        db.commit()
                        logger.info(f"Webhook successfully fulfilled order {order_id} with {payment_order.credits} credits.")
                        return {"status": "fulfilled", "order_id": order_id, "payment_id": payment_id}

        return {"status": "ignored_or_already_processed", "event": event_type}

    @staticmethod
    def record_payment_failure(
        db: Session,
        user: models.User,
        razorpay_order_id: str,
        error_code: str = None,
        error_description: str = None
    ) -> dict:
        """
        Records a failed payment attempt or cancellation for auditing.
        """
        payment_order = db.query(models.PaymentOrder).filter(
            models.PaymentOrder.order_id == razorpay_order_id
        ).first()

        if payment_order and payment_order.user_id == user.id and payment_order.status == "CREATED":
            payment_order.status = "FAILED"
            payment_order.error_code = error_code or "CLIENT_CANCELLED"
            payment_order.error_description = error_description or "Payment was cancelled or failed by user."
            payment_order.updated_at = datetime.now(timezone.utc)
            db.add(payment_order)
            db.commit()
            logger.info(f"Recorded payment failure for order {razorpay_order_id}: {error_description}")

        return {"success": True, "status": "FAILED"}

