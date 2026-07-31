#!/usr/bin/env bun
/** Alias → registry agent `fanduel`. */
import { runBookCli } from './baseline-scrape-book.ts';
import { asSportsbookId } from '../lib/types/branded.ts';
await runBookCli(asSportsbookId('fanduel'));
