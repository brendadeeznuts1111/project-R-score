
// TSX loader - TypeScript + JSX
import React from 'react';

interface Props {
  title: string;
  count: number;
}

export function Counter({ title, count }: Props) {
  return <div>{title}: {count}</div>;
}

export const tsxComponent = <Counter title="TSX" count={42} />;
