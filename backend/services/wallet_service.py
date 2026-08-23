import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
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

