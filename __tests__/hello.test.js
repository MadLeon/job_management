/**
 * 示例 React 组件测试
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

function Hello() {
  return <div>Hello, Jest!</div>;
}

test('渲染 Hello 组件', () => {
  render(<Hello />);
  expect(screen.getByText('Hello, Jest!')).toBeInTheDocument();
});
