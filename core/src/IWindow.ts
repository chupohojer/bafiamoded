import { WindowEvents } from '../../launcher/src/Window'
import { EventHandle, EventPriority } from './Events'

export default interface IWindow {
  readonly id: number
  readonly pid: number

  isAlive: boolean
  isActivated: boolean
  isMaximum: boolean
  isLocked: boolean

  title: string
  x: number
  y: number
  width: number
  height: number
  minWidth: number
  minHeight: number
  titleBarHeight: number
  resizable: boolean
  moveable: boolean
  hasTitleBar: boolean
  closeButton: boolean
  minButton: boolean
  maxButton: boolean
  zoom: number

  activate: () => void
  deactivate: () => void
  lock: () => void
  unlock: () => void
  show: () => void
  hide: () => void
  min: () => void
  max: () => void
  close: (force?: boolean) => void

  // @ts-ignore
  on: <K extends keyof WindowEvents>(evt: K, callback: WindowEvents[K], priority: EventPriority = EventPriority.NORMAL) => EventHandle<WindowEvents[K]>
  // @ts-ignore
  once: <K extends keyof WindowEvents>(evt: K, callback: WindowEvents[K], priority: EventPriority = EventPriority.NORMAL) => EventHandle<WindowEvents[K]>
  off: <K extends keyof WindowEvents>(evt: K, callback: WindowEvents[K]) => boolean
  // @ts-ignore
  call: <K extends keyof WindowEvents>(evt: K, event: Parameters<WindowEvents[K]>[0] = undefined) => Promise<Parameters<WindowEvents[K]>[0]>
  emit: <K extends keyof WindowEvents>(evt: K, ...args: Parameters<WindowEvents[K]> | []) => boolean
  emitR: <K extends keyof WindowEvents>(evt: K, ...args: Parameters<WindowEvents[K]> | []) => Promise<ReturnType<WindowEvents[K]>[]>
  // @ts-ignore
  wait: <K extends keyof WindowEvents>(type: K, timeout = 10_000_000) => Promise<Parameters<WindowEvents[K]> | []>
  removeByKey: (key: string) => boolean
  removeAllEvents: () => void
}
