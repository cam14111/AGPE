import { Toaster as Sonner, type ToasterProps } from 'sonner'

// Position : bottom-center sur mobile, bottom-right sur desktop (UI_DESIGN_SPEC §6).
function Toaster(props: ToasterProps) {
  return (
    <>
      <Sonner
        className="toaster group sm:hidden"
        position="bottom-center"
        richColors
        {...props}
      />
      <Sonner
        className="toaster group hidden sm:block"
        position="bottom-right"
        richColors
        {...props}
      />
    </>
  )
}

export { Toaster }
