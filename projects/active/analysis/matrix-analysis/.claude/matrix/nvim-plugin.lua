-- Tier-1380 OMEGA: Neovim Plugin for matrix:cols
-- Installation: Copy to ~/.config/nvim/lua/plugins/matrix-cols.lua
-- Or use with lazy.nvim, packer, etc.

local M = {}

-- Configuration
M.config = {
  -- Path to the CLI
  cli_path = vim.fn.expand("~/path/to/matrix/column-standards-all.ts"),
  -- Default preview window settings
  preview = {
    split = "right",
    width = 60,
  },
  -- Keymaps
  keymaps = {
    open = "<leader>mc",
    search = "<leader>ms",
    find = "<leader>mf",
  }
}

-- Setup function
M.setup = function(opts)
  M.config = vim.tbl_deep_extend("force", M.config, opts or {})
  
  -- Create commands
  vim.api.nvim_create_user_command("MatrixCols", function(args)
    M.open_picker()
  end, { desc = "Open matrix:cols picker" })
  
  vim.api.nvim_create_user_command("MatrixGet", function(args)
    M.get_column(args.args)
  end, { nargs = 1, desc = "Get column details" })
  
  vim.api.nvim_create_user_command("MatrixSearch", function(args)
    M.search(args.args)
  end, { nargs = "?", desc = "Search columns" })
  
  vim.api.nvim_create_user_command("MatrixZone", function(args)
    M.show_zone(args.args)
  end, { nargs = 1, complete = M.zone_completion, desc = "Show zone" })
  
  -- Set up keymaps
  if M.config.keymaps.open then
    vim.keymap.set("n", M.config.keymaps.open, M.open_picker, 
      { desc = "Open matrix:cols picker" })
  end
  
  if M.config.keymaps.search then
    vim.keymap.set("n", M.config.keymaps.search, function()
      vim.ui.input({ prompt = "Search columns: " }, function(input)
        if input then M.search(input) end
      end)
    end, { desc = "Search matrix columns" })
  end
end

-- Get list of columns using fzf-lua or telescope
M.open_picker = function()
  -- Try fzf-lua first
  local ok, fzf = pcall(require, "fzf-lua")
  if ok then
    fzf.fzf_exec("bun " .. M.config.cli_path .. " pipe names", {
      prompt = "🔥 Matrix Columns: ",
      preview = "bun " .. M.config.cli_path .. " get {} --no-color",
      actions = {
        ["default"] = function(selected)
          M.show_column(selected[1])
        end,
        ["ctrl-o"] = function(selected)
          M.preview_column(selected[1])
        end,
        ["ctrl-y"] = function(selected)
          M.yank_column_name(selected[1])
        end,
      }
    })
    return
  end
  
  -- Fallback to telescope
  local ok_telescope, telescope = pcall(require, "telescope")
  if ok_telescope then
    local pickers = require("telescope.pickers")
    local finders = require("telescope.finders")
    local conf = require("telescope.config").values
    local actions = require("telescope.actions")
    local action_state = require("telescope.actions.state")
    
    local columns = vim.fn.systemlist("bun " .. M.config.cli_path .. " pipe names")
    
    pickers.new({}, {
      prompt_title = "🔥 Matrix Columns",
      finder = finders.new_table({ results = columns }),
      sorter = conf.generic_sorter({}),
      previewer = require("telescope.previewers").new_buffer_previewer({
        define_preview = function(self, entry)
          local output = vim.fn.systemlist("bun " .. M.config.cli_path .. " get " .. entry.value .. " --no-color")
          vim.api.nvim_buf_set_lines(self.state.bufnr, 0, -1, false, output)
        end,
      }),
      attach_mappings = function(prompt_bufnr)
        actions.select_default:replace(function()
          local selection = action_state.get_selected_entry()
          actions.close(prompt_bufnr)
          M.show_column(selection.value)
        end)
        return true
      end,
    }):find()
    return
  end
  
  -- Fallback to native vim.ui.select
  local columns = vim.fn.systemlist("bun " .. M.config.cli_path .. " pipe names")
  vim.ui.select(columns, { prompt = "🔥 Select column:" }, function(choice)
    if choice then M.show_column(choice) end
  end)
end

-- Show column in split
M.show_column = function(col)
  local output = vim.fn.systemlist("bun " .. M.config.cli_path .. " get " .. col .. " --no-color")
  
  -- Create or reuse buffer
  local buf = vim.fn.bufnr("🔥 Matrix Col " .. col, true)
  vim.api.nvim_buf_set_option(buf, "buftype", "nofile")
  vim.api.nvim_buf_set_option(buf, "filetype", "markdown")
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, output)
  
  -- Open in split
  vim.cmd("vsplit")
  vim.api.nvim_win_set_buf(0, buf)
  vim.cmd("vertical resize " .. M.config.preview.width)
end

-- Preview column in floating window
M.preview_column = function(col)
  local output = vim.fn.systemlist("bun " .. M.config.cli_path .. " get " .. col .. " --no-color")
  
  local width = 80
  local height = 30
  local row = math.floor((vim.o.lines - height) / 2)
  local col_pos = math.floor((vim.o.columns - width) / 2)
  
  local buf = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, output)
  vim.api.nvim_buf_set_option(buf, "filetype", "markdown")
  
  local win = vim.api.nvim_open_win(buf, true, {
    relative = "editor",
    width = width,
    height = height,
    row = row,
    col = col_pos,
    style = "minimal",
    border = "rounded",
    title = " 🔥 Column " .. col .. " ",
    title_pos = "center",
  })
  
  -- Close on q
  vim.keymap.set("n", "q", function() vim.api.nvim_win_close(win, true) end, 
    { buffer = buf, nowait = true })
end

-- Yank column name
M.yank_column_name = function(col)
  vim.fn.setreg("+", col)
  vim.notify("Yanked: " .. col, vim.log.levels.INFO)
end

-- Search columns
M.search = function(term)
  if not term or term == "" then
    vim.ui.input({ prompt = "Search: " }, function(input)
      if input then M.search(input) end
    end)
    return
  end
  
  local output = vim.fn.systemlist("bun " .. M.config.cli_path .. " search " .. term .. " --no-color")
  
  local buf = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, output)
  vim.api.nvim_buf_set_option(buf, "filetype", "markdown")
  
  vim.cmd("split")
  vim.api.nvim_win_set_buf(0, buf)
  vim.api.nvim_win_set_height(0, 20)
end

-- Show zone
M.show_zone = function(zone)
  local output = vim.fn.systemlist("bun " .. M.config.cli_path .. " " .. zone .. " --no-color")
  
  local buf = vim.fn.bufnr("🔥 Zone " .. zone, true)
  vim.api.nvim_buf_set_option(buf, "buftype", "nofile")
  vim.api.nvim_buf_set_option(buf, "filetype", "markdown")
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, output)
  
  vim.cmd("vsplit")
  vim.api.nvim_win_set_buf(0, buf)
end

-- Completion for zones
M.zone_completion = function()
  return { "tension", "cloudflare", "chrome", "core", "validation", 
           "security", "infra", "default", "extensibility", "skills" }
end

-- Get column under cursor
M.get_column_under_cursor = function()
  local line = vim.api.nvim_get_current_line()
  local col = line:match("Col%((%d+)%)") or line:match("col%-(%d+)")
  
  if col then
    M.show_column(col)
  else
    vim.notify("No column reference found under cursor", vim.log.levels.WARN)
  end
end

return M

-- Example lazy.nvim configuration:
--[[
{
  dir = "~/path/to/matrix",
  name = "matrix-cols",
  config = function()
    require("matrix-cols").setup({
      cli_path = vim.fn.expand("~/path/to/matrix/column-standards-all.ts"),
      keymaps = {
        open = "<leader>mc",
        search = "<leader>ms",
      }
    })
  end,
  keys = {
    { "<leader>mc", function() require("matrix-cols").open_picker() end, desc = "Matrix columns" },
    { "gd", function() require("matrix-cols").get_column_under_cursor() end, desc = "Go to column" },
  }
}
--]]
