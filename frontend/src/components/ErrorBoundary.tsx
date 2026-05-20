import React from 'react';

const serializeError = (error: any) => {
  if (error instanceof Error) {
    return error.message + '\n' + error.stack;
  }
  return JSON.stringify(error, null, 2);
};

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
  requestId: string;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, requestId: '', copied: false };
  }

  static getDerivedStateFromError(error: any) {
    const requestId = (window as any).__lastRequestId || '';
    return { hasError: true, error, requestId, copied: false };
  }

  handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(this.state.requestId);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // 剪贴板不可用时静默失败
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-300 rounded-lg bg-red-50">
          <h2 className="text-red-600 text-lg font-medium mb-2">页面出错了</h2>
          <p className="text-gray-600 text-sm mb-3">
            请将下方错误编号提供给开发者，以便快速定位问题。
          </p>
          {this.state.requestId && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-gray-500">错误编号：</span>
              <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                {this.state.requestId}
              </code>
              <button
                onClick={this.handleCopy}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100"
              >
                {this.state.copied ? '已复制' : '复制'}
              </button>
            </div>
          )}
          <details className="mt-2">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
              查看详细错误信息
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-60">
              {serializeError(this.state.error)}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
