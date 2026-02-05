" CRC32 Dark Theme for Vim/Neovim

set background=dark
hi clear
syntax reset

let g:colors_name = "crc32-dark"

" Editor colors
hi Normal guifg=#e6e6e6 guibg=#0f172a
hi LineNr guifg=#64748b guibg=#1e293b
hi CursorLine guibg=#1e293b
hi Visual guibg=#334155
hi Search guifg=#0f172a guibg=#22c55e

" Syntax highlighting
hi Keyword guifg=#3b82f6 gui=bold
hi Function guifg=#f59e0b
hi String guifg=#22c55e
hi Number guifg=#ef4444
hi Type guifg=#8b5cf6
hi Comment guifg=#6b7280 gui=italic
hi Operator guifg=#e6e6e6
hi Punctuation guifg=#94a3b8

" Status line
hi StatusLine guifg=#e6e6e6 guibg=#1e293b
hi StatusLineNC guifg=#94a3b8 guibg=#334155

" Terminal colors
let g:terminal_color_0 = '#0f172a'
let g:terminal_color_1 = '#ef4444'
let g:terminal_color_2 = '#22c55e'
let g:terminal_color_3 = '#f59e0b'
let g:terminal_color_4 = '#3b82f6'
let g:terminal_color_5 = '#8b5cf6'
let g:terminal_color_6 = '#06b6d4'
let g:terminal_color_7 = '#e6e6e6'
