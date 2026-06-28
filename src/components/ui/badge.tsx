import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-lg border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-terracotta/10 text-terracotta border-terracotta/20 [a]:hover:bg-terracotta/20",
        secondary:
          "bg-warm-sand text-charcoal-warm border-border-cream [a]:hover:bg-opacity-80",
        success:
          "bg-accent/10 text-accent border-accent/20 [a]:hover:bg-accent/20",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 focus-visible:ring-destructive/20 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-content-primary [a]:hover:bg-warm-sand [a]:hover:text-content-primary",
        ghost:
          "hover:bg-warm-sand hover:text-content-primary",
        link: "text-terracotta underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
