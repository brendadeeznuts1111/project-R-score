/**
 * @difficulty intermediate
 * @tags urlpattern, search, query
 * @emoji 🔍
 */

// URLPattern with search parameters
const searchPattern = new URLPattern({
  pathname: "/search/:query",
  search: "*"
});

const match = searchPattern.exec("https://example.com/search/javascript?sort=popular&page=1");
console.log("Search pattern:", match);
