import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Check if device is a mobile device by user agent
const detectMobileUserAgent = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)
  const [isMobileDevice, setIsMobileDevice] = React.useState<boolean | undefined>(undefined)

  // Detect by screen size
  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Detect by user agent for actual mobile devices
  React.useEffect(() => {
    setIsMobileDevice(detectMobileUserAgent())
  }, [])

  // Return true if either screen size is mobile OR it's a mobile device
  return !!isMobile || !!isMobileDevice
}
