#!/usr/bin/env bun
/** Alias → registry agent `caesars`. */
import { runBookCli } from './baseline-scrape-book.ts';
import { asSportsbookId } from '../lib/types/branded.ts';
await runBookCli(asSportsbookId('caesars'));
