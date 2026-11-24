import { expect, test } from "vitest";
import { addressGroup } from "@sharadox/protection-web-library/address-group";

test("keeps an IPv4 address as it is: one address, one visitor", () => {
  expect(addressGroup("203.0.113.7")).toBe("203.0.113.7");
});

test("groups IPv6 by its /64, which one home or server usually holds whole", () => {
  expect(addressGroup("2001:db8:1:2:aaaa:bbbb:cccc:dddd")).toBe("2001:db8:1:2::/64");
  expect(addressGroup("2001:DB8:1:2::1")).toBe("2001:db8:1:2::/64");
  expect(addressGroup("2001:db8::1")).toBe("2001:db8:0:0::/64");
  expect(addressGroup("::1")).toBe("0:0:0:0::/64");
  expect(addressGroup("2001:db8:1::")).toBe("2001:db8:1:0::/64");
});

test("unwraps IPv4 written as IPv6", () => {
  expect(addressGroup("::ffff:203.0.113.7")).toBe("203.0.113.7");
});

test("puts anything that isn't an address in one group", () => {
  expect(addressGroup("unknown")).toBe("unknown");
  expect(addressGroup("not an address")).toBe("unknown");
});
