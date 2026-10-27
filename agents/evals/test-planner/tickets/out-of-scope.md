# Product search

### Summary
Search returns matching products through the API and the UI

### User story
As a shopper, I want to search for products by name, so that I can find them quickly.

### Acceptance criteria
- POST /api/searchProduct with search_product=blue returns responseCode 200 and only blue products
- Searching for "blue" on the products page lists only products matching "blue"

### Priority
Medium

### Component
Products
