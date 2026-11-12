"""Data shapes shared by every stage of the pipeline."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class POLine(BaseModel):
    line_no: int
    part_number: str = Field(description="Part number exactly as printed on the PO")
    description: str = ""
    quantity: float
    uom: str = Field(description="Unit of measure as printed, e.g. EA, BX, CS")
    unit_price: Optional[float] = Field(default=None, description="None if the PO shows no price")


class PurchaseOrder(BaseModel):
    """What an extractor returns: the PO as printed, before any ERP lookups."""

    po_number: Optional[str] = None
    customer_name: Optional[str] = None
    bill_to: Optional[str] = None
    ship_to: Optional[str] = None
    requested_date: Optional[str] = Field(default=None, description="As printed on the PO")
    ship_via: Optional[str] = None
    carrier_account: Optional[str] = Field(default=None, description="Third-party carrier account number")
    notes: Optional[str] = None
    lines: list[POLine] = []
    uncertain_fields: list[str] = Field(
        default=[], description="Field names the extractor could not read with confidence"
    )


class Flag(BaseModel):
    code: str
    message: str
    blocking: bool = True
    line_no: Optional[int] = None


class ResolvedLine(BaseModel):
    line_no: int
    item_no: str
    quantity: float
    uom: str
    unit_price: Optional[float]
    printed_part: str


class ResolvedOrder(BaseModel):
    """The PO after checking against ERP reference data."""

    po_number: str = ""
    customer_id: str = ""
    shipto_id: str = ""
    requested_date: str = ""
    ship_via: str = ""
    carrier_account: str = ""
    notes: str = ""
    lines: list[ResolvedLine] = []
    flags: list[Flag] = []

    @property
    def needs_review(self) -> bool:
        return any(f.blocking for f in self.flags)
