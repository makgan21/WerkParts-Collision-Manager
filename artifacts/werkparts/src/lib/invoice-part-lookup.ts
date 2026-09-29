import type { CrossReference, Part } from "@workspace/api-client-react";

const CUSTOMER_PRICE_FACTOR = 0.6;

const normalizePartNumber = (value: string) => value.trim().toLowerCase();

export const getCustomerPrice = (part: Part): string => {
  if (part.priceEach == null || part.priceEach.trim() === "") return "";

  const priceEach = Number(part.priceEach);
  return Number.isFinite(priceEach)
    ? (priceEach / CUSTOMER_PRICE_FACTOR).toFixed(2)
    : "";
};

export const findInvoicePart = (
  partNumber: string,
  parts: readonly Part[] | undefined,
  crossReferences: readonly CrossReference[] | undefined,
): Part | undefined => {
  const normalizedPartNumber = normalizePartNumber(partNumber);
  if (!normalizedPartNumber || !parts) return undefined;

  const directMatch = parts.find(
    (part) => normalizePartNumber(part.partNumber) === normalizedPartNumber,
  );
  if (directMatch) return directMatch;

  const crossReference = crossReferences?.find(
    (reference) => normalizePartNumber(reference.referenceNumber) === normalizedPartNumber,
  );

  return crossReference
    ? parts.find((part) => part.id === crossReference.partId)
    : undefined;
};