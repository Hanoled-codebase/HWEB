"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

/** On/off control. The track is 44px wide so it is a comfortable thumb target on its own. */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-7 w-11 shrink-0 cursor-pointer items-center rounded-full bg-slate-200 p-0.5 transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-blue-600/30 data-checked:bg-blue-600 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-6 rounded-full bg-white shadow-[0_1px_3px_rgba(11,18,32,0.25)] transition-transform duration-150 ease-out data-checked:translate-x-4"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
