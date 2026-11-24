import { isIPv4, isIPv6 } from "node:net";

/** The eight 16-bit groups of an IPv6 address, `::` expanded. */
function groups(address: string): string[] {
  const [head, tail] = address.toLowerCase().split("::") as [string, string | undefined];
  const left = head ? head.split(":") : [];
  if (tail === undefined) return left;
  const right = tail ? tail.split(":") : [];
  return [...left, ...Array<string>(8 - left.length - right.length).fill("0"), ...right];
}

/**
 * The group of addresses one visitor most likely controls, for rate limits: an IPv4 address alone, and an IPv6
 * address's whole /64 (a home or a server usually gets a /64, so counting single IPv6 addresses would let one
 * visitor change address at will). IPv4 written as IPv6 (`::ffff:203.0.113.7`) counts as IPv4; anything else is
 * "unknown", one shared group.
 *
 * @example
 * addressGroup(clientAddress(await headers())); // "2001:db8:1:2::/64"
 */
export function addressGroup(address: string): string {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  if (mapped && isIPv4(mapped)) return mapped;
  if (isIPv4(address)) return address;
  if (!isIPv6(address)) return "unknown";
  return `${groups(address)
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}
