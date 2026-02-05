# Makefile - Checkpoint-based execution
CHECKPOINT_DIR := .tier1380-checkpoints
GUARD := bun -e 'import{interactive}from"./lib/interactive-cli";await interactive.execute("$(@)",async()=>"")'

.PHONY: all validate release check reset demo

all: check validate release

check:
	@mkdir -p $(CHECKPOINT_DIR)
	@if [ -f $(CHECKPOINT_DIR)/validate.done ]; then \
		read -p "Validation already done. Re-run? [y/N] " ans; \
		if [ "$$ans" != "y" ]; then \
			echo "Skipping validation"; \
			exit 0; \
		fi; \
	fi

validate: check
	$(GUARD) && bun scripts/validate-pointers.ts --bun-native
	@touch $(CHECKPOINT_DIR)/validate.done
	@echo "✅ Checkpoint: validate"

release: validate
	@if [ -f $(CHECKPOINT_DIR)/release.done ]; then \
		read -p "Release already created. Overwrite? [y/N] " ans; \
		if [ "$$ans" != "y" ]; then exit 0; fi; \
	fi
	./scripts/release-archive.sh
	@touch $(CHECKPOINT_DIR)/release.done
	@echo "✅ Checkpoint: release"

reset:
	rm -rf $(CHECKPOINT_DIR)
	@echo "🔄 Checkpoints cleared"

demo:
	@echo "🧪 Running LoopGuard demo..."
	bun scripts/demo-loop-guard.ts
