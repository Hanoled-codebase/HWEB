import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // max-md:/pointer-coarse:min-* is a thumb floor: pages often pass h-8/h-9 for desktop density,
  // phones and touch tablets still get 44px; mouse users keep the dense size.
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[color,background-color,border-color,box-shadow,opacity,scale] duration-[110ms] ease-[var(--ease-out-smooth)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer max-md:min-h-11 max-md:min-w-11 pointer-coarse:min-h-11 pointer-coarse:min-w-11",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline max-md:min-h-0 max-md:min-w-0 pointer-coarse:min-h-0 pointer-coarse:min-w-0",
      },
      size: {
        default: "h-11 md:pointer-fine:h-10 px-4 py-2",
        sm: "h-11 md:pointer-fine:h-9 rounded-md px-3.5",
        lg: "h-12 rounded-md px-8",
        icon: "h-11 w-11 md:pointer-fine:h-10 md:pointer-fine:w-10",
        iconSm: "h-11 w-11 md:pointer-fine:h-9 md:pointer-fine:w-9",
        iconLg: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
