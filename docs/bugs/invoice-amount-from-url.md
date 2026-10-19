# Invoice amount is taken from the URL

A defect in automationexercise.com, found by this suite. It's recorded here because the site has no public tracker.

- **Severity:** High on a real shop (invoice integrity). Low priority here, since we don't own the site.
- **Found:** 16 October 2026. **Reproduced:** 19 October 2026.

## Steps to reproduce

1. Without logging in, open `https://automationexercise.com/download_invoice/0`.
2. Open `https://automationexercise.com/download_invoice/1`.

## Expected

An invoice is only available to its buyer, for an order that exists, and states that order's total.

## Actual

Both return `200` and download `invoice.txt`:

- `Hi , Your total purchase amount is 0. Thank you`
- `Hi , Your total purchase amount is 1. Thank you`

Negative and non-numeric amounts return 404, so the only check is that the path segment is a number.

## How it was found

In the stability run (`--repeat-each=5`), two invoice tests failed because the site invoiced orders with a total of 0. Both happened while the server was returning Cloudflare 520 errors, and their artifacts weren't kept. Probing the endpoint explains how this can happen: the confirmation page builds the invoice link from the amount it displays. A total that's wrong during a partial failure reaches the customer's invoice without any check against the order.

## Impact

- An invoice isn't proof of a purchase, because anyone can generate one for any amount.
- A wrong total during a server error is passed on to the customer without any check.

## Coverage

`checkout.spec.ts` › *should download an invoice naming the buyer and the order total* asserts that the invoice states the real order total, so a 0 invoice in a real journey fails the test. The URL isn't probed directly, because the suite tests shopper journeys, not endpoints (see [TEST_STRATEGY.md](../../TEST_STRATEGY.md)).
