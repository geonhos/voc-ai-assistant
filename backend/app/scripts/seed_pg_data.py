"""
PG 도메인 Mock 데이터 시더

가맹점, 트랜잭션, 정산, 에러코드, API 로그 생성.

Usage:
    cd backend && python -m app.scripts.seed_pg_data
"""

import asyncio
import random
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.api_log import ApiLog
from app.models.error_code import ErrorCode
from app.models.merchant import Merchant
from app.models.settlement import Settlement
from app.models.transaction import Transaction
from app.models.user import User

# ---------------------------------------------------------------------------
# Seed constants
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class MerchantSeed:
    mid: str
    name: str
    business_number: str
    status: str
    fee_rate: float
    settlement_cycle: str


MERCHANTS: list[MerchantSeed] = [
    MerchantSeed("M001", "쿠킹마켓",  "123-45-67890", "ACTIVE",     2.5, "D+3"),
    MerchantSeed("M002", "패션플러스", "234-56-78901", "ACTIVE",     3.0, "D+3"),
    MerchantSeed("M003", "테크존",    "345-67-89012", "ACTIVE",     2.0, "D+2"),
    MerchantSeed("M004", "헬스라이프", "456-78-90123", "ACTIVE",     2.8, "D+3"),
    MerchantSeed("M005", "북스토리",  "567-89-01234", "SUSPENDED",  2.5, "D+5"),
]

# 30 error codes across five categories
ERROR_CODES: list[dict] = [
    # CARD
    {"code": "E001", "category": "CARD",    "description": "카드 번호 오류",     "solution": "카드 번호를 다시 확인해주세요.",                                                      "severity": "LOW"},
    {"code": "E002", "category": "CARD",    "description": "유효기간 만료",      "solution": "카드 유효기간을 확인하거나 새 카드를 사용해주세요.",                                    "severity": "LOW"},
    {"code": "E003", "category": "CARD",    "description": "카드 한도 초과",     "solution": "카드사에 한도 확인 후 한도 상향을 요청하거나 다른 카드를 사용해주세요.",              "severity": "MEDIUM"},
    {"code": "E004", "category": "CARD",    "description": "분실/도난 카드",     "solution": "카드사에 문의하여 카드 상태를 확인해주세요.",                                          "severity": "HIGH"},
    {"code": "E005", "category": "CARD",    "description": "사용 정지된 카드",   "solution": "카드사에 문의하여 카드 사용 정지 해제를 요청해주세요.",                                "severity": "MEDIUM"},
    {"code": "E006", "category": "CARD",    "description": "할부 불가 카드",     "solution": "일시불로 결제하거나 할부 가능한 카드를 사용해주세요.",                                  "severity": "LOW"},
    {"code": "E007", "category": "CARD",    "description": "카드사 점검 중",     "solution": "잠시 후 다시 시도해주세요. 카드사 점검 시간을 확인해주세요.",                          "severity": "MEDIUM"},
    # NETWORK
    {"code": "E101", "category": "NETWORK", "description": "통신 타임아웃",      "solution": "네트워크 상태를 확인하고 재시도해주세요.",                                             "severity": "MEDIUM"},
    {"code": "E102", "category": "NETWORK", "description": "VAN사 통신 오류",    "solution": "VAN사 연결 상태를 확인하고 잠시 후 재시도해주세요.",                                   "severity": "HIGH"},
    {"code": "E103", "category": "NETWORK", "description": "SSL 인증서 오류",    "solution": "SSL 인증서 갱신이 필요합니다. 기술팀에 문의해주세요.",                                 "severity": "CRITICAL"},
    {"code": "E104", "category": "NETWORK", "description": "DNS 조회 실패",      "solution": "네트워크 설정을 확인해주세요.",                                                        "severity": "HIGH"},
    {"code": "E105", "category": "NETWORK", "description": "연결 거부",          "solution": "방화벽 설정을 확인하고 허용된 IP인지 확인해주세요.",                                   "severity": "HIGH"},
    # AUTH
    {"code": "E201", "category": "AUTH",    "description": "인증키 오류",        "solution": "API 인증키를 확인해주세요. 관리자 페이지에서 재발급 가능합니다.",                       "severity": "HIGH"},
    {"code": "E202", "category": "AUTH",    "description": "가맹점 미등록",      "solution": "가맹점 등록 상태를 확인해주세요.",                                                     "severity": "HIGH"},
    {"code": "E203", "category": "AUTH",    "description": "API 키 만료",        "solution": "API 키를 갱신해주세요. 관리자 페이지에서 재발급 가능합니다.",                          "severity": "MEDIUM"},
    {"code": "E204", "category": "AUTH",    "description": "IP 접근 제한",       "solution": "허용된 IP 목록에 서버 IP를 추가해주세요.",                                             "severity": "MEDIUM"},
    {"code": "E205", "category": "AUTH",    "description": "중복 요청 감지",     "solution": "동일 거래번호로 중복 요청이 감지되었습니다. 거래번호를 확인해주세요.",                 "severity": "LOW"},
    # SYSTEM
    {"code": "E301", "category": "SYSTEM",  "description": "시스템 점검 중",     "solution": "정기 점검 시간입니다. 점검 완료 후 재시도해주세요.",                                   "severity": "MEDIUM"},
    {"code": "E302", "category": "SYSTEM",  "description": "DB 처리 오류",       "solution": "일시적인 오류입니다. 재시도해주세요. 반복 시 기술팀에 문의해주세요.",                  "severity": "CRITICAL"},
    {"code": "E303", "category": "SYSTEM",  "description": "파라미터 검증 실패", "solution": "요청 파라미터를 API 문서에 맞게 확인해주세요.",                                        "severity": "LOW"},
    {"code": "E304", "category": "SYSTEM",  "description": "결제 금액 불일치",   "solution": "요청 금액과 승인 금액이 다릅니다. 금액을 확인해주세요.",                               "severity": "HIGH"},
    {"code": "E305", "category": "SYSTEM",  "description": "일일 한도 초과",     "solution": "가맹점 일일 결제 한도를 초과했습니다. 한도 상향을 요청해주세요.",                      "severity": "MEDIUM"},
    # BANK
    {"code": "E401", "category": "BANK",    "description": "은행 점검 시간",     "solution": "은행 점검 시간(23:30~00:30)을 피해서 재시도해주세요.",                                 "severity": "LOW"},
    {"code": "E402", "category": "BANK",    "description": "계좌번호 오류",      "solution": "계좌번호를 다시 확인해주세요.",                                                        "severity": "LOW"},
    {"code": "E403", "category": "BANK",    "description": "잔액 부족",          "solution": "계좌 잔액을 확인해주세요.",                                                            "severity": "MEDIUM"},
    {"code": "E404", "category": "BANK",    "description": "이체 한도 초과",     "solution": "은행 이체 한도를 확인하고 한도 변경을 요청해주세요.",                                  "severity": "MEDIUM"},
    {"code": "E405", "category": "BANK",    "description": "가상계좌 만료",      "solution": "가상계좌 유효기간이 만료되었습니다. 새 가상계좌를 발급받아주세요.",                    "severity": "LOW"},
    {"code": "E406", "category": "BANK",    "description": "수취인 불일치",      "solution": "입금자명과 수취인명을 확인해주세요.",                                                  "severity": "MEDIUM"},
    {"code": "E407", "category": "BANK",    "description": "거래 제한 계좌",     "solution": "해당 계좌는 거래 제한 상태입니다. 은행에 문의해주세요.",                               "severity": "HIGH"},
    {"code": "E408", "category": "BANK",    "description": "원화 환전 오류",     "solution": "해외 결제 시 환전 오류가 발생했습니다. 카드사에 문의해주세요.",                        "severity": "MEDIUM"},
]

# Build a quick lookup: code -> description for use in Transaction seeding
_ERROR_DESC: dict[str, str] = {e["code"]: e["description"] for e in ERROR_CODES}

CARD_COMPANIES = [
    "신한카드", "삼성카드", "현대카드", "KB국민카드",
    "롯데카드", "하나카드", "우리카드", "NH농협카드",
]
PAYMENT_METHODS = ["CARD", "BANK_TRANSFER", "VIRTUAL_ACCOUNT", "MOBILE"]
CUSTOMER_NAMES = ["김철수", "이영희", "박지민", "최수진", "정민호", "한소영", "강태우", "윤서연"]
FAIL_ERROR_CODES = ["E001", "E002", "E003", "E004", "E005", "E101", "E102", "E201", "E301", "E303"]
AMOUNTS = [10_000, 15_000, 25_000, 30_000, 50_000, 75_000, 100_000, 150_000, 250_000, 500_000]
API_ENDPOINTS = [
    "/api/v1/payments",
    "/api/v1/payments/cancel",
    "/api/v1/settlements",
    "/api/v1/cards/auth",
    "/api/v1/virtual-accounts",
]
API_ERROR_CODES = ["E201", "E301", "E303", "E101"]

# ---------------------------------------------------------------------------
# Seeder functions
# ---------------------------------------------------------------------------


async def _seed_error_codes(db) -> None:
    """Insert error codes that do not already exist."""
    for ec in ERROR_CODES:
        result = await db.execute(select(ErrorCode).where(ErrorCode.code == ec["code"]))
        if result.scalar_one_or_none() is None:
            db.add(ErrorCode(**ec))
    await db.commit()
    print(f"[OK] {len(ERROR_CODES)} error codes seeded")


async def _seed_merchants(db) -> dict[str, int]:
    """Upsert merchants and return mapping of mid -> DB id.

    Args:
        db: Active AsyncSession.

    Returns:
        Dict mapping merchant MID string to integer primary key.
    """
    mid_to_id: dict[str, int] = {}
    for m in MERCHANTS:
        result = await db.execute(select(Merchant).where(Merchant.mid == m.mid))
        merchant = result.scalar_one_or_none()
        if merchant is None:
            merchant = Merchant(
                mid=m.mid,
                name=m.name,
                business_number=m.business_number,
                status=m.status,
                settings={"fee_rate": m.fee_rate, "settlement_cycle": m.settlement_cycle},
            )
            db.add(merchant)
            await db.commit()
            await db.refresh(merchant)
        mid_to_id[m.mid] = merchant.id
    print(f"[OK] {len(MERCHANTS)} merchants seeded")
    return mid_to_id


async def _seed_merchant_users(db, mid_to_id: dict[str, int]) -> None:
    """Create one MERCHANT-role user per merchant (password: merchant123).

    Args:
        db: Active AsyncSession.
        mid_to_id: Mapping of MID string to merchant primary key.
    """
    hashed = hash_password("merchant123")
    for m in MERCHANTS:
        email = f"{m.mid.lower()}@merchant.local"
        result = await db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none() is None:
            db.add(
                User(
                    email=email,
                    password_hash=hashed,
                    role="MERCHANT",
                    merchant_id=mid_to_id[m.mid],
                )
            )
    await db.commit()
    print("[OK] Merchant users created (email: <mid>@merchant.local / password: merchant123)")


def _build_transaction(
    *,
    merchant_id: int,
    tx_index: int,
    tx_time: datetime,
) -> Transaction:
    """Construct a single Transaction instance with randomised fields.

    Args:
        merchant_id: FK to the owning merchant.
        tx_index: Zero-based index used to make the TID unique.
        tx_time: Timestamp for this transaction.

    Returns:
        An unsaved Transaction ORM instance.
    """
    status = random.choices(
        ["SUCCESS", "FAIL", "CANCEL", "PARTIAL_CANCEL"],
        weights=[70, 15, 10, 5],
    )[0]
    payment_method = random.choice(PAYMENT_METHODS)

    error_code: Optional[str] = None
    error_message: Optional[str] = None
    if status == "FAIL":
        error_code = random.choice(FAIL_ERROR_CODES)
        error_message = _ERROR_DESC.get(error_code)

    card_company = random.choice(CARD_COMPANIES) if payment_method == "CARD" else None
    card_masked = f"****-****-****-{random.randint(1000, 9999)}" if payment_method == "CARD" else None

    approved_at = tx_time if status == "SUCCESS" else None
    cancelled_at = (
        tx_time + timedelta(hours=random.randint(1, 48))
        if status in ("CANCEL", "PARTIAL_CANCEL")
        else None
    )

    return Transaction(
        tid=f"TXN{tx_time.strftime('%Y%m%d')}{merchant_id:03d}{tx_index:04d}",
        merchant_id=merchant_id,
        amount=random.choice(AMOUNTS),
        payment_method=payment_method,
        card_company=card_company,
        card_number_masked=card_masked,
        status=status,
        error_code=error_code,
        error_message=error_message,
        customer_name=random.choice(CUSTOMER_NAMES),
        order_id=f"ORD-{merchant_id}-{random.randint(10_000, 99_999)}",
        approved_at=approved_at,
        cancelled_at=cancelled_at,
        created_at=tx_time,
    )


async def _seed_transactions(db, mid_to_id: dict[str, int]) -> None:
    """Seed 50-80 transactions per merchant spread over the last 90 days.

    Args:
        db: Active AsyncSession.
        mid_to_id: Mapping of MID string to merchant primary key.
    """
    now = datetime.now(timezone.utc)
    total = 0
    for merchant_id in mid_to_id.values():
        count = random.randint(50, 80)
        for i in range(count):
            tx_time = now - timedelta(
                days=random.randint(0, 90),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59),
            )
            db.add(_build_transaction(merchant_id=merchant_id, tx_index=i, tx_time=tx_time))
        total += count
        await db.commit()
    print(f"[OK] {total} transactions seeded (~50-80 per merchant, 90-day window)")


def _settlement_date_for_offset(month_offset: int) -> date:
    """Return the 15th of the month that is `month_offset` months before today.

    Args:
        month_offset: How many months in the past (0 = current month).

    Returns:
        A date object set to the 15th of the target month.
    """
    today = date.today()
    month = today.month - month_offset
    year = today.year
    while month <= 0:
        month += 12
        year -= 1
    return date(year, month, 15)


async def _seed_settlements(db, mid_to_id: dict[str, int]) -> None:
    """Create 3 months of settlement records per merchant.

    Args:
        db: Active AsyncSession.
        mid_to_id: Mapping of MID string to merchant primary key.
    """
    now = datetime.now(timezone.utc)
    total = 0
    for merchant_id in mid_to_id.values():
        for month_offset in range(3):
            total_amount = random.randint(1_000_000, 10_000_000)
            fee_amount = int(total_amount * random.uniform(0.02, 0.035))
            net_amount = total_amount - fee_amount

            is_past = month_offset > 0
            status = "COMPLETED" if is_past else random.choice(["PENDING", "COMPLETED", "DELAYED"])
            completed_at = now if status == "COMPLETED" else None

            db.add(
                Settlement(
                    merchant_id=merchant_id,
                    settlement_date=_settlement_date_for_offset(month_offset),
                    total_amount=total_amount,
                    fee_amount=fee_amount,
                    net_amount=net_amount,
                    transaction_count=random.randint(30, 80),
                    status=status,
                    completed_at=completed_at,
                )
            )
            total += 1
        await db.commit()
    print(f"[OK] {total} settlement records seeded (3 months per merchant)")


async def _seed_api_logs(db, mid_to_id: dict[str, int]) -> None:
    """Seed 30-50 API log entries per merchant from the last 30 days.

    Args:
        db: Active AsyncSession.
        mid_to_id: Mapping of MID string to merchant primary key.
    """
    now = datetime.now(timezone.utc)
    total = 0
    for merchant_id in mid_to_id.values():
        count = random.randint(30, 50)
        for _ in range(count):
            log_time = now - timedelta(
                days=random.randint(0, 30),
                hours=random.randint(0, 23),
            )
            is_error = random.random() < 0.15
            status_code = random.choice([400, 401, 500, 503]) if is_error else 200
            error_code = random.choice(API_ERROR_CODES) if is_error else None
            error_message = "API 호출 실패" if is_error else None
            latency_ms = random.randint(500, 5_000) if is_error else random.randint(50, 500)

            db.add(
                ApiLog(
                    merchant_id=merchant_id,
                    endpoint=random.choice(API_ENDPOINTS),
                    method=random.choice(["POST", "GET"]),
                    status_code=status_code,
                    error_code=error_code,
                    error_message=error_message,
                    latency_ms=latency_ms,
                    created_at=log_time,
                )
            )
        total += count
        await db.commit()
    print(f"[OK] {total} API log entries seeded (~30-50 per merchant, 30-day window)")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


async def seed() -> None:
    """Run all PG domain seeders in dependency order."""
    async with AsyncSessionLocal() as db:
        print("--- PG Domain Seed Starting ---")

        await _seed_error_codes(db)
        mid_to_id = await _seed_merchants(db)
        await _seed_merchant_users(db, mid_to_id)
        await _seed_transactions(db, mid_to_id)
        await _seed_settlements(db, mid_to_id)
        await _seed_api_logs(db, mid_to_id)

        print("\n=== PG Domain Seed Complete ===")
        print(f"  Merchants : {len(MERCHANTS)}")
        print(f"  Error codes: {len(ERROR_CODES)}")
        print("  Users     : 1 per merchant (role=MERCHANT)")
        print("  Transactions: 50-80 per merchant")
        print("  Settlements : 3 months per merchant")
        print("  API logs  : 30-50 per merchant")


if __name__ == "__main__":
    asyncio.run(seed())
