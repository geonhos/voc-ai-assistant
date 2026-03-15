"""Database seed script.

Creates an admin user and 5 Korean knowledge-base articles.
Idempotent — safe to run multiple times.

Usage:
    cd backend && python -m scripts.seed
"""

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.knowledge import KnowledgeArticle
from app.models.user import User

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

ADMIN_EMAIL = "admin"
ADMIN_PASSWORD = "1234"

ARTICLES: list[dict] = [
    {
        "title": "결제 실패 시 대처 방법",
        "category": "결제",
        "content": (
            "결제 실패는 다양한 원인으로 발생할 수 있습니다. 가장 흔한 원인으로는 카드 한도 초과, "
            "잘못된 카드 정보 입력, 은행 점검 시간, 그리고 VPN 사용으로 인한 차단 등이 있습니다.\n\n"
            "먼저 카드사 앱이나 인터넷뱅킹에서 카드 한도와 잔액을 확인해 주세요. "
            "한도가 충분하다면 카드 번호, 유효기간, CVC 번호를 다시 한번 정확히 입력했는지 확인합니다.\n\n"
            "다른 결제 수단(다른 카드, 계좌이체, 간편결제 등)으로 재시도해 보시고, "
            "동일한 문제가 반복될 경우 고객센터(1588-0000)로 문의해 주시면 빠르게 도와드리겠습니다.\n\n"
            "결제 과정에서 금액이 이중으로 청구되었다면 영업일 기준 3~5일 이내 자동 취소됩니다. "
            "취소가 지연될 경우에도 고객센터로 연락해 주세요.\n\n"
            "보안을 위해 공공 Wi-Fi 환경에서의 결제는 피해 주시고, "
            "결제 페이지 URL이 https로 시작하는지 반드시 확인하시기 바랍니다."
        ),
        "tags": ["결제", "카드", "결제실패", "오류"],
    },
    {
        "title": "배송 지연 안내 가이드",
        "category": "배송",
        "content": (
            "배송 지연은 기상 악화, 물류 센터 과부하, 택배사 사정, 수령지 주소 오류 등 "
            "다양한 요인으로 발생할 수 있습니다. 고객님의 불편을 드려 진심으로 사과드립니다.\n\n"
            "주문 상세 페이지 또는 마이페이지의 '배송 조회' 버튼을 클릭하면 "
            "실시간 배송 위치와 예상 도착 시간을 확인하실 수 있습니다.\n\n"
            "주문 후 3영업일이 지나도 배송이 시작되지 않으면 담당 팀에서 먼저 연락을 드립니다. "
            "평균 배송 기간은 결제 완료 후 2~3영업일이며, 제주 및 도서·산간 지역은 1~2일 추가 소요됩니다.\n\n"
            "배송 지연이 판매자 귀책 사유인 경우, 지연 일수에 따라 쿠폰 또는 포인트 보상을 제공합니다. "
            "보상 기준은 고객센터 공지 또는 이메일로 안내드립니다.\n\n"
            "배송지 주소 변경은 '배송 준비 중' 단계까지만 가능합니다. "
            "이미 배송이 시작된 경우 택배사(1588-1234)에 직접 문의하시면 협의가 가능합니다."
        ),
        "tags": ["배송", "배송지연", "배송조회", "택배"],
    },
    {
        "title": "비밀번호 재설정 절차",
        "category": "계정",
        "content": (
            "비밀번호를 잊어버리셨거나 보안을 위해 변경하려는 경우, 아래 절차를 따라주세요.\n\n"
            "로그인 화면에서 '비밀번호 찾기' 링크를 클릭한 후 "
            "가입 시 등록한 이메일 주소를 입력합니다. "
            "이메일 수신함을 확인하면 비밀번호 재설정 링크가 포함된 메일이 도착합니다. "
            "링크 유효 시간은 30분이니 빠르게 클릭해 주세요.\n\n"
            "새 비밀번호는 최소 8자 이상이어야 하며, "
            "영문 대/소문자, 숫자, 특수문자(!@#$%^&*)를 각각 1개 이상 포함해야 합니다. "
            "이전에 사용한 비밀번호 3개는 재사용이 불가합니다.\n\n"
            "재설정 메일이 수신되지 않는 경우 스팸 메일함을 확인하시거나, "
            "메일 주소를 여러 개 사용하는 경우 다른 주소로도 시도해 보세요. "
            "그래도 문제가 해결되지 않으면 고객센터로 문의 주시면 본인 확인 후 처리해 드립니다.\n\n"
            "보안을 위해 비밀번호는 6개월마다 변경하는 것을 권장하며, "
            "동일한 비밀번호를 여러 사이트에서 사용하지 않도록 해주세요."
        ),
        "tags": ["계정", "비밀번호", "재설정", "로그인"],
    },
    {
        "title": "환불 및 교환 정책 안내",
        "category": "주문",
        "content": (
            "고객님께서 구매하신 상품에 문제가 있거나 마음이 바뀌셨다면 "
            "아래 정책에 따라 환불 또는 교환을 신청하실 수 있습니다.\n\n"
            "단순 변심에 의한 반품은 상품 수령일로부터 7일 이내에 신청 가능합니다. "
            "상품 태그 및 포장이 그대로 유지되어야 하며, 사용 흔적이 없어야 합니다. "
            "반품 배송비는 고객 부담(왕복 6,000원)이며, 불량·오배송의 경우 판매자가 부담합니다.\n\n"
            "환불은 반품 상품 회수 및 검수 완료 후 3~5영업일 이내에 처리됩니다. "
            "결제 수단에 따라 카드 취소는 2~3영업일, 계좌 환불은 1~2영업일이 추가 소요될 수 있습니다.\n\n"
            "교환은 동일 상품의 사이즈·색상 변경에 한하여 가능하며, "
            "재고 부족 시 환불로 처리됩니다. "
            "교환 신청은 수령일로부터 7일, 불량품은 30일 이내에 가능합니다.\n\n"
            "환불·교환 신청은 마이페이지 > 주문내역 > 해당 주문에서 직접 하시거나 "
            "고객센터 채팅/전화를 통해 접수하실 수 있습니다."
        ),
        "tags": ["환불", "교환", "반품", "주문취소"],
    },
    {
        "title": "쿠폰 사용 방법 및 주의사항",
        "category": "프로모션",
        "content": (
            "쿠폰은 결제 단계에서 적용할 수 있으며, 한 주문에 1개의 쿠폰만 사용 가능합니다. "
            "쿠폰 코드가 있는 경우 '쿠폰 코드 입력' 란에 입력하면 자동 적용됩니다.\n\n"
            "보유 쿠폰은 마이페이지 > 쿠폰함에서 확인하실 수 있습니다. "
            "각 쿠폰에는 사용 조건(최소 주문 금액, 적용 카테고리), 할인율 또는 할인 금액, "
            "유효 기간이 표시되어 있으니 사용 전에 꼭 확인해 주세요.\n\n"
            "쿠폰 사용 시 주의사항은 다음과 같습니다. "
            "쿠폰은 일부 브랜드 또는 기획전 상품에 적용이 제한될 수 있습니다. "
            "이미 할인된 상품에는 중복 적용이 불가한 경우가 있습니다. "
            "유효 기간이 지난 쿠폰은 자동 소멸되며 복구되지 않습니다.\n\n"
            "주문 취소 시 쿠폰 복구 정책: 유효 기간 내 쿠폰은 자동 복구됩니다. "
            "단, 쿠폰 이벤트 참여 조건을 충족하지 못하게 된 경우 복구가 제한될 수 있습니다.\n\n"
            "쿠폰 관련 문의사항은 고객센터 채팅 또는 이메일(support@voc.ai)로 연락해 주시면 "
            "신속하게 도와드리겠습니다."
        ),
        "tags": ["쿠폰", "할인", "프로모션", "이벤트"],
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_or_create_admin(session: AsyncSession) -> User:
    """Return the existing admin user or create a new one.

    Args:
        session: Active async database session.

    Returns:
        Admin User ORM instance.
    """
    result = await session.execute(select(User).where(User.email == ADMIN_EMAIL))
    user = result.scalar_one_or_none()
    if user:
        logger.info("Admin user already exists — skipping creation.")
        return user

    user = User(
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        role="ADMIN",
    )
    session.add(user)
    await session.flush()  # Populate user.id before returning
    logger.info("Created admin user: %s", ADMIN_EMAIL)
    return user


async def _seed_articles(session: AsyncSession, admin: User) -> None:
    """Insert knowledge-base articles that do not already exist.

    Args:
        session: Active async database session.
        admin: Admin user to set as article creator.
    """
    for data in ARTICLES:
        result = await session.execute(
            select(KnowledgeArticle).where(KnowledgeArticle.title == data["title"])
        )
        existing = result.scalar_one_or_none()
        if existing:
            logger.info("Article already exists — skipping: %r", data["title"])
            continue

        embedding = await _generate_embedding(data["title"] + " " + data["content"])

        article = KnowledgeArticle(
            title=data["title"],
            category=data["category"],
            content=data["content"],
            tags=data["tags"],
            active=True,
            created_by=admin.id,
            embedding=embedding,
        )
        session.add(article)
        logger.info("Created article: %r", data["title"])


async def _generate_embedding(text: str) -> list[float] | None:
    """Generate a text embedding via Ollama.

    Args:
        text: The text to embed.

    Returns:
        A list of floats representing the embedding, or None if unavailable.
    """
    try:
        import httpx  # noqa: PLC0415

        async with httpx.AsyncClient(base_url=settings.OLLAMA_URL, timeout=60.0) as client:
            response = await client.post(
                "/api/embed",
                json={"model": settings.OLLAMA_EMBED_MODEL, "input": text},
            )
            response.raise_for_status()
            data = response.json()
            return data["embeddings"][0]
    except Exception as exc:  # pragma: no cover
        logger.warning("Embedding generation failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


async def main() -> None:
    """Run the seed script against the configured database."""
    logger.info("Starting database seed...")
    async with AsyncSessionLocal() as session:
        try:
            admin = await _get_or_create_admin(session)
            await _seed_articles(session, admin)
            await session.commit()
            logger.info("Seed completed successfully.")
        except Exception:
            await session.rollback()
            logger.exception("Seed failed — transaction rolled back.")
            raise


if __name__ == "__main__":
    asyncio.run(main())
