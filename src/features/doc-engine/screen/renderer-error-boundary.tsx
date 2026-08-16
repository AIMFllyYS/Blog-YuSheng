'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

import { DocumentFallbackCard } from './fallback-card'

type RendererErrorBoundaryProps = {
  readonly nodeId: string
  readonly rendererName: string
  readonly showDetails: boolean
  readonly children: ReactNode
  readonly alternative?: ReactNode
  readonly blockId?: string
  readonly selectable?: 'none'
}

type RendererErrorBoundaryState = {
  readonly error?: Error
  readonly componentStack?: string
}

export class RendererErrorBoundary extends Component<
  RendererErrorBoundaryProps,
  RendererErrorBoundaryState
> {
  state: RendererErrorBoundaryState = {}

  static getDerivedStateFromError(reason: unknown): RendererErrorBoundaryState {
    return {
      error:
        reason instanceof Error
          ? reason
          : new Error('renderer 抛出了非 Error 异常。'),
    }
  }

  componentDidCatch(_error: Error, info: ErrorInfo): void {
    this.setState({ componentStack: info.componentStack ?? undefined })
  }

  componentDidUpdate(previous: RendererErrorBoundaryProps): void {
    if (
      previous.nodeId !== this.props.nodeId &&
      this.state.error !== undefined
    ) {
      this.setState({ error: undefined, componentStack: undefined })
    }
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    const details = this.props.showDetails
      ? [
          `renderer：${this.props.rendererName}`,
          `异常：${this.state.error.message}`,
          this.state.componentStack?.trim(),
        ]
          .filter(Boolean)
          .join('\n')
      : undefined
    return (
      <DocumentFallbackCard
        blockId={this.props.blockId}
        code="DOC-RENDER-001"
        details={details}
        message="这个内容组件没有加载成功，其他内容仍可继续阅读。"
        nodeId={this.props.nodeId}
        selectable={this.props.selectable}
      >
        {this.props.alternative}
      </DocumentFallbackCard>
    )
  }
}
