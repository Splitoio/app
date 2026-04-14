// DEAD — address truncation done inline elsewhere; not imported by any page or layout.
type AddressDisplayProps = {
  address: string;
  className?: string;
};

export function AddressDisplay({
  address,
  className = "",
}: AddressDisplayProps) {
  const formattedAddress = `${address.slice(0, 5)}...${address.slice(-2)}`;

  return <span className={`text-white ${className}`}>{formattedAddress}</span>;
}
