from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RegulatorySource(Base):
    __tablename__ = "regulatory_sources"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    authority: Mapped[str] = mapped_column(String(120), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    citation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_uri: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RegulatoryRule(Base):
    __tablename__ = "regulatory_rules"
    __table_args__ = (UniqueConstraint("stable_code", name="uq_regulatory_rule_code"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    stable_code: Mapped[str] = mapped_column(String(120), nullable=False)
    source_domain: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RegulatoryRuleVersion(Base):
    __tablename__ = "regulatory_rule_versions"
    __table_args__ = (UniqueConstraint("regulatory_rule_id", "version", name="uq_regulatory_rule_version"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    regulatory_rule_id: Mapped[UUID] = mapped_column(
        ForeignKey("regulatory_rules.id", ondelete="RESTRICT"), nullable=False
    )
    regulatory_source_id: Mapped[UUID] = mapped_column(
        ForeignKey("regulatory_sources.id", ondelete="RESTRICT"), nullable=False
    )
    version: Mapped[str] = mapped_column(String(120), nullable=False)
    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    applicability: Mapped[str | None] = mapped_column(Text, nullable=True)
    jurisdiction: Mapped[str | None] = mapped_column(String(255), nullable=True)
    software_requirement: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProductRegulatoryProfile(Base):
    __tablename__ = "product_regulatory_profiles"
    __table_args__ = (UniqueConstraint("product_id", "regulatory_rule_version_id", name="uq_product_rule_profile"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    regulatory_rule_version_id: Mapped[UUID] = mapped_column(
        ForeignKey("regulatory_rule_versions.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(80), nullable=False, default="REGULATORY VERIFICATION REQUIRED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
