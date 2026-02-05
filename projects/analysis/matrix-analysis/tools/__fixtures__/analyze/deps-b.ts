/** Fixture: imports from local (deps-a) */
import { use } from "./deps-a";

export function get() {
	return use;
}
