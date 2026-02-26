import type { Contract } from "@/features/business/api/client";
import { formatCurrency } from "@/utils/formatters";
import { jsPDF } from "jspdf";

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatFrequency(f: string | null | undefined): string | null {
  if (!f) return null;
  return f.charAt(0) + f.slice(1).toLowerCase();
}

const MARGIN = 20;
const PAGE_WIDTH = 210; // A4
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const LINE_HEIGHT = 6;
const LABEL_FONT_SIZE = 8;
const VALUE_FONT_SIZE = 10;
const TITLE_FONT_SIZE = 16;
const STATUS_FONT_SIZE = 9;
const FOOTER_MARGIN = 15;

/**
 * Splits text into lines that fit within maxWidth. Returns new y position after drawing.
 */
function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number
): number {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    if (y > 270) {
      doc.addPage();
      y = MARGIN;
    }
    doc.text(line, x, y);
    y += LINE_HEIGHT;
  }
  return y;
}

/**
 * Adds a label-value row. Returns new y position.
 */
function addRow(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number
): number {
  if (y > 260) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setFontSize(LABEL_FONT_SIZE);
  doc.setTextColor(107, 114, 128);
  doc.text(label.toUpperCase(), x, y);
  y += 4;
  doc.setFontSize(VALUE_FONT_SIZE);
  doc.setTextColor(17, 24, 39);
  y = addWrappedText(doc, value || "—", x, y, CONTENT_WIDTH, VALUE_FONT_SIZE);
  return y + 6;
}

/**
 * Adds a block (label + multiline value). Returns new y position.
 */
function addBlock(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number
): number {
  if (y > 260) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setFontSize(LABEL_FONT_SIZE);
  doc.setTextColor(107, 114, 128);
  doc.text(label.toUpperCase(), x, y);
  y += 4;
  doc.setFontSize(VALUE_FONT_SIZE);
  doc.setTextColor(17, 24, 39);
  y = addWrappedText(doc, value, x, y, CONTENT_WIDTH, VALUE_FONT_SIZE);
  return y + 10;
}

/**
 * Generates a PDF for the contract and triggers a file download.
 */
export function downloadContract(contract: Contract): void {
  const doc = new jsPDF();
  const compensationStr =
    contract.compensationAmount != null
      ? `${formatCurrency(contract.compensationAmount, contract.compensationCurrency ?? "USD")}${contract.paymentFrequency ? ` / ${formatFrequency(contract.paymentFrequency)}` : ""}`
      : null;
  const durationStr =
    contract.startDate || contract.endDate
      ? `${formatDate(contract.startDate)}${contract.endDate ? ` → ${formatDate(contract.endDate)}` : " · No end date"}`
      : null;
  const noticeStr =
    contract.noticePeriodDays != null
      ? `${contract.noticePeriodDays} day${contract.noticePeriodDays !== 1 ? "s" : ""}`
      : null;
  const assignedName =
    contract.assignedTo?.name || contract.assignedTo?.email || contract.assignedToEmail || "—";
  const createdByName = contract.createdBy?.name || contract.createdBy?.email || "—";
  const isSigned = !!contract.signedAt;

  let y = MARGIN;
  const x = MARGIN;

  // Title
  doc.setFontSize(TITLE_FONT_SIZE);
  doc.setTextColor(17, 24, 39);
  const title = contract.title || "Contract";
  y = addWrappedText(doc, title, x, y, CONTENT_WIDTH, TITLE_FONT_SIZE) + 4;

  // Status
  doc.setFontSize(STATUS_FONT_SIZE);
  if (isSigned) {
    doc.setTextColor(5, 95, 70);
    doc.text(`Signed ${formatDate(contract.signedAt)}`, x, y);
  } else {
    doc.setTextColor(75, 85, 99);
    doc.text("Awaiting signature", x, y);
  }
  y += 12;

  doc.setTextColor(17, 24, 39);

  if (contract.organization?.name) {
    y = addRow(doc, "Organization", contract.organization.name, x, y);
  }
  if (contract.jobTitle) {
    y = addRow(doc, "Job Title", contract.jobTitle, x, y);
  }
  if (compensationStr) {
    y = addRow(doc, "Compensation", compensationStr, x, y);
  }
  if (durationStr) {
    y = addRow(doc, "Duration", durationStr, x, y);
  }
  if (noticeStr) {
    y = addRow(doc, "Notice Period", noticeStr, x, y);
  }
  if (contract.description) {
    y = addBlock(doc, "Description", contract.description, x, y);
  }
  if (contract.scopeOfWork) {
    y = addBlock(doc, "Scope of Work", contract.scopeOfWork, x, y);
  }
  if (contract.specialClause) {
    y = addBlock(doc, "Special Clause", contract.specialClause, x, y);
  }

  y = addRow(doc, "Assigned To", assignedName, x, y);
  y = addRow(doc, "Created By", createdByName, x, y);
  y = addRow(doc, "Created", formatDate(contract.createdAt), x, y);
  if (isSigned && contract.signedAt) {
    addRow(doc, "Signed", formatDate(contract.signedAt), x, y);
  }

  const fileName = `${(contract.title || "contract").replace(/[^a-z0-9-_]/gi, "_")}.pdf`;
  doc.save(fileName);
}
