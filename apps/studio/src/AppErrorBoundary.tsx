import {Component, type ReactNode} from "react";

type StoryStageErrorBoundaryProps = {
  children: ReactNode;
  onReload?: () => void;
};

type StoryStageErrorBoundaryState = {
  error: Error | null;
};

export class StoryStageErrorBoundary extends Component<StoryStageErrorBoundaryProps, StoryStageErrorBoundaryState> {
  override state: StoryStageErrorBoundaryState = {error: null};

  static getDerivedStateFromError(error: Error): StoryStageErrorBoundaryState {
    return {error};
  }

  override render() {
    if (!this.state.error) return this.props.children;

    const reload = this.props.onReload ?? (() => window.location.reload());
    return (
      <main className="fatal-error" role="alert">
        <div className="fatal-error-mark"><span /></div>
        <p className="eyebrow">Workspace display stopped safely</p>
        <h1>StoryStage hit a display error.</h1>
        <p>The editor stopped before it could show an incorrect state. Saved local productions are untouched; unsaved interface changes may need to be repeated.</p>
        <button onClick={reload}>Reload StoryStage</button>
        <details><summary>Technical detail</summary><code>{this.state.error.name}: {this.state.error.message}</code></details>
      </main>
    );
  }
}
