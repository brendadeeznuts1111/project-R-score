import { mock } from "bun:test";

const noop = () => null;
const reactMock = {
  default: {},
  createElement: noop,
  Fragment: "Fragment",
  useState: (v: unknown) => [v, noop],
  useEffect: noop,
  useRef: () => ({ current: null }),
  useMemo: (fn: () => unknown) => fn(),
  useCallback: (fn: unknown) => fn,
  useContext: noop,
  useReducer: (r: unknown, i: unknown) => [i, noop],
  createContext: () => ({ Provider: noop, Consumer: noop }),
  forwardRef: (c: unknown) => c,
  memo: (c: unknown) => c,
  lazy: (c: unknown) => c,
  Suspense: noop,
  Children: { map: noop, forEach: noop, count: () => 0, toArray: () => [], only: noop },
};

mock.module("react", () => reactMock);
mock.module("react/jsx-dev-runtime", () => ({ jsxDEV: noop, Fragment: "Fragment" }));
mock.module("react/jsx-runtime", () => ({ jsx: noop, jsxs: noop, Fragment: "Fragment" }));
mock.module("react-dom", () => ({ default: {}, render: noop, createPortal: noop }));
mock.module("react-dom/client", () => ({ createRoot: () => ({ render: noop, unmount: noop }) }));
