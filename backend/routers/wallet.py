import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

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

