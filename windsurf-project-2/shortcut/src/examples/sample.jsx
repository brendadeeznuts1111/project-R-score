
// JSX loader - converts JSX to JS
import React from 'react';

export function Greeting({ name }) {
  return <div>Hello, {name}!</div>;
}

export const jsxComponent = <h1>JSX works!</h1>;
