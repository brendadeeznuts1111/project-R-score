
function App() {
  const isDev = process.env.NODE_ENV === "development";
  return (
    <div>
      <h1>Hello {isDev ? "Developer" : "World"}</h1>
      <p>Environment: {process.env.NODE_ENV}</p>
    </div>
  );
}
