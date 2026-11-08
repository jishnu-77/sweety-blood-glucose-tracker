// Shows the loading and error states for a useFetch result, then renders children(data).
export default function Async({ state, children }) {
  if (state.error) {
    return (
      <p className="message error" role="alert">
        {state.error}
      </p>
    );
  }
  if (!state.data) {
    return <p className="muted">Loading…</p>;
  }
  return children(state.data);
}
