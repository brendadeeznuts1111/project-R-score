/**
 * @difficulty beginner
 * @tags urlpattern, routing, basics
 * @emoji 🚀
 */

// Basic URLPattern usage
const pattern = new URLPattern({ pathname: "/books/:id" });
const match = pattern.exec("https://example.com/books/123");

console.log("Basic URLPattern:", match);
