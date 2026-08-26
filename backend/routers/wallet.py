import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator

from backend import database, models
from backend.services.auth_service import get_current_user, get_admin_user
from backend.services.wallet_service import WalletService
from backend.core.config import settings

logger = logging.getLogger("backend.routers.wallet")
router = APIRouter(tags=["wallet"])

# --- Schemas ---
class WalletRechargeRequest(BaseModel):
    user_id: int
    credits: int
    type: str  # CREDIT or DEBIT
    remarks: Optional[str] = "Manual adjustment"

class WalletBalanceResponse(BaseModel):
    balance: int
    wallet_enabled: bool
    support_whatsapp: str
    support_upi: str

class TransactionResponse(BaseModel):
    id: int
    wallet_id: int
    user_id: int
    type: str
    source: str
    credits: int
    balance_after: int
    remarks: Optional[str]
    created_at: str

class CreateOrderRequest(BaseModel):
    credits: int

    @field_validator('credits')
    @classmethod
    def validate_credits(cls, v):
        if isinstance(v, bool) or not isinstance(v, int):
            raise ValueError("ક્રેડિટ્સ પૂર્ણાંક સંખ્યા (Integer) હોવી જોઈએ.")
        if v < 50:
            raise ValueError("ઓછામાં ઓછા 50 ક્રેડિટ્સ ઉમેરવા જરૂરી છે.")
        return v

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class PaymentFailureRequest(BaseModel):
    razorpay_order_id: str
    error_code: Optional[str] = None
    error_description: Optional[str] = None

class RechargePlansResponse(BaseModel):
    plans: List[dict] = []
    razorpay_key_id: str
    wallet_enabled: bool
    min_credits: int = 50
    rate_inr_per_credit: int = 1

# --- Endpoints ---

@router.get("/wallet/balance", response_model=WalletBalanceResponse)
def get_balance(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get the current wallet balance of the authenticated user, along with configuration support details.
    """
    wallet = WalletService.get_wallet(db, current_user.id)
    return {
        "balance": wallet.current_balance,
        "wallet_enabled": settings.WALLET_ENABLED,
        "support_whatsapp": settings.SUPPORT_WHATSAPP_NUMBER,
        "support_upi": settings.SUPPORT_UPI_ID
    }

@router.get("/wallet/transactions", response_model=List[TransactionResponse])
def get_transactions(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get the wallet transactions history list for the current authenticated user.
    """
    txs = db.query(models.WalletTransaction).filter(
        models.WalletTransaction.user_id == current_user.id
    ).order_by(models.WalletTransaction.created_at.desc()).all()

    result = []
    for tx in txs:
        result.append({
            "id": tx.id,
            "wallet_id": tx.wallet_id,
            "user_id": tx.user_id,
            "type": tx.type,
            "source": tx.source,
            "credits": tx.credits,
            "balance_after": tx.balance_after,
            "remarks": tx.remarks,
            "created_at": tx.created_at.isoformat()
        })
    return result

# --- Razorpay Payment Gateway Endpoints ---

@router.get("/wallet/plans", response_model=RechargePlansResponse)
def get_recharge_plans():
    """
    Public / Authenticated: Returns custom credit recharge configurations and public Razorpay Key ID.
    Never exposes RAZORPAY_KEY_SECRET.
    """
    return {
        "plans": settings.RECHARGE_PLANS,
        "razorpay_key_id": settings.RAZORPAY_KEY_ID,
        "wallet_enabled": settings.WALLET_ENABLED,
        "min_credits": 50,
        "rate_inr_per_credit": 1
    }

@router.post("/wallet/create-order")
def create_recharge_order(
    req: CreateOrderRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Authenticated user: Creates a server-authoritative Razorpay payment order for a custom credit recharge.
    Frontend only passes `credits`; pricing (1 credit = ₹1) and payable amount are strictly calculated and enforced by backend.
    """
    if not settings.WALLET_ENABLED:
        raise HTTPException(
            status_code=400,
            detail="Wallet functionality is currently disabled."
        )
    return WalletService.create_razorpay_order(db=db, user=current_user, credits=req.credits)

@router.post("/wallet/verify-payment")
def verify_payment(
    req: VerifyPaymentRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Authenticated user: Securely verifies the Razorpay signature on server-side and
    idempotently adds purchased credits to user's wallet.
    """
    if not settings.WALLET_ENABLED:
        raise HTTPException(
            status_code=400,
            detail="Wallet functionality is currently disabled."
        )
    return WalletService.verify_and_fulfill_payment(
        db=db,
        user=current_user,
        razorpay_order_id=req.razorpay_order_id,
        razorpay_payment_id=req.razorpay_payment_id,
        razorpay_signature=req.razorpay_signature
    )

@router.post("/wallet/payment-failed")
def report_payment_failure(
    req: PaymentFailureRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Authenticated user: Logs a client-side payment failure or cancellation for audit tracking.
    """
    return WalletService.record_payment_failure(
        db=db,
        user=current_user,
        razorpay_order_id=req.razorpay_order_id,
        error_code=req.error_code,
        error_description=req.error_description
    )

@router.post("/wallet/webhook/razorpay")
async def razorpay_webhook(
    request: Request,
    db: Session = Depends(database.get_db),
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature")
):
    """
    Razorpay Webhook listener: Provides automated server-to-server payment verification and
    idempotent credit fulfillment in case the frontend callback fails or user closes browser.
    """
    raw_body = await request.body()
    return WalletService.process_webhook(
        db=db,
        payload_bytes=raw_body,
        signature_header=x_razorpay_signature or ""
    )

@router.get("/admin/wallets", response_model=List[dict])
def list_wallets(
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(get_admin_user),
    search: Optional[str] = None
):
    """
    Admin only: List and search all user wallets. Includes user profiles information.
    """
    query = db.query(models.Wallet)
    if search:
        search_val = f"%{search}%"
        query = query.join(models.User).filter(
            (models.User.username.like(search_val)) |
            (models.User.mobile_number.like(search_val))
        )
    
    wallets = query.all()
    result = []
    for w in wallets:
        user = w.user
        result.append({
            "user_id": user.id,
            "username": user.username,
            "mobile_number": user.mobile_number,
            "wallet_id": w.id,
            "current_balance": w.current_balance,
            "created_at": w.created_at.isoformat(),
            "updated_at": w.updated_at.isoformat()
        })
    return result

@router.post("/admin/wallets/recharge")
def admin_recharge(
    req: WalletRechargeRequest,
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(get_admin_user)
):
    """
    Admin only: Manually adjust the wallet balance of a specific user.
    Records the operation in transaction ledger history.
    """
    if req.type not in ["CREDIT", "DEBIT"]:
        raise HTTPException(status_code=400, detail="Invalid adjustment type. Must be CREDIT or DEBIT.")
    
    if req.credits <= 0:
        raise HTTPException(status_code=400, detail="Credits amount must be greater than zero.")

    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    try:
        remarks = req.remarks or f"Admin manual adjustment ({admin.username})"
        wallet = WalletService.adjust_balance(
            db=db,
            user_id=req.user_id,
            credits=req.credits,
            type=req.type,
            source="ADMIN",
            remarks=remarks
        )
        db.commit()
        
        # Log to system activity logs
        from backend.services.activity_service import log_activity
        action_text = f"Manual recharge: {req.type} {req.credits} credits"
        log_activity(db, admin.username, action_text, "user", str(req.user_id))
        
        return {
            "success": True,
            "message": f"Successfully updated wallet balance.",
            "current_balance": wallet.current_balance
        }
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        logger.error(f"Error in admin wallet adjustment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/wallets/initialize")
def initialize_existing_wallets(
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(get_admin_user)
):
    """
    Admin only: One-time idempotent wallet migration for existing users.
    """
    try:
        summary = WalletService.migrate_existing_users(db)
        
        # Log to system activity logs
        from backend.services.activity_service import log_activity
        log_activity(
            db, 
            admin.username, 
            f"Executed Wallet Migration: Scanned {summary['scanned']}, Created {summary['created']}, Skipped {summary['skipped']}, Errors {summary['errors']}", 
            "system", 
            "wallet_migration"
        )
        
        return summary
    except Exception as e:
        logger.error(f"Error in initialize_existing_wallets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

