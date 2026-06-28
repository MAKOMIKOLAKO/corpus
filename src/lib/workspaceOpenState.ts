// HIDDEN — only used by disabled features
let workspaceOpenInFlight = false

export function beginWorkspaceOpen(): boolean {
  if (workspaceOpenInFlight) {
    return false
  }

  workspaceOpenInFlight = true
  return true
}

export function clearWorkspaceOpen(): void {
  workspaceOpenInFlight = false
}
