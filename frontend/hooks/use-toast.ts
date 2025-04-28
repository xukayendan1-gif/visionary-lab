// Inspired by react-hot-toast library
import { useState, useEffect, useCallback } from "react"

import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

export type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function generateId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: string
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: string
    }

interface State {
  toasts: ToasterToast[]
}

export function useToast() {
  const [state, setState] = useState<State>({ toasts: [] })

  const dispatch = useCallback((action: Action) => {
    switch (action.type) {
      case "ADD_TOAST":
        setState((state) => {
          // Limit the number of toasts shown
          if (state.toasts.length >= TOAST_LIMIT) {
            // Dismiss oldest toast
            dispatch({
              type: "DISMISS_TOAST",
              toastId: state.toasts[0].id,
            })
          }

          return {
            ...state,
            toasts: [action.toast, ...state.toasts],
          }
        })
        break

      case "UPDATE_TOAST":
        setState((state) => {
          const { toast } = action
          const { id, ...rest } = toast

          if (!id) {
            return state
          }

          return {
            ...state,
            toasts: state.toasts.map((t) =>
              t.id === id
                ? {
                    ...t,
                    ...rest,
                  }
                : t
            ),
          }
        })
        break

      case "DISMISS_TOAST":
        setState((state) => {
          const { toastId } = action

          // Dismiss all toasts if no id is provided
          if (toastId === undefined) {
            return {
              ...state,
              toasts: state.toasts.map((t) => ({
                ...t,
                open: false,
              })),
            }
          }

          // Dismiss single toast by id
          return {
            ...state,
            toasts: state.toasts.map((t) =>
              t.id === toastId
                ? {
                    ...t,
                    open: false,
                  }
                : t
            ),
          }
        })
        break

      case "REMOVE_TOAST":
        setState((state) => {
          const { toastId } = action

          // Remove all toasts if no id is provided
          if (toastId === undefined) {
            return {
              ...state,
              toasts: [],
            }
          }

          // Remove single toast by id
          return {
            ...state,
            toasts: state.toasts.filter((t) => t.id !== toastId),
          }
        })
        break
    }
  }, [])

  // Automatically dismiss toasts when closed
  useEffect(() => {
    state.toasts.forEach((toast) => {
      if (!toast.open) {
        setTimeout(() => {
          dispatch({
            type: "REMOVE_TOAST",
            toastId: toast.id,
          })
        }, TOAST_REMOVE_DELAY)
      }
    })
  }, [state.toasts, dispatch])

  const toast = useCallback(
    (props: Omit<ToasterToast, "id">) => {
      const id = generateId()

      dispatch({
        type: "ADD_TOAST",
        toast: {
          ...props,
          id,
          open: true,
        },
      })

      return {
        id,
        dismiss: () => {
          dispatch({
            type: "DISMISS_TOAST",
            toastId: id,
          })
        },
        update: (props: Omit<ToasterToast, "id">) => {
          dispatch({
            type: "UPDATE_TOAST",
            toast: {
              ...props,
              id,
            },
          })
        },
      }
    },
    [dispatch]
  )

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => {
      dispatch({
        type: "DISMISS_TOAST",
        toastId,
      })
    },
  }
} 