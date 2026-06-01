/**
 * Extend React JSX intrinsic elements to allow the named component tags
 * used inside <Trans> children (l1, l2, l3, …).
 * react-i18next maps these to the `components` prop at runtime.
 */
import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      l1: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      l2: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      l3: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      l4: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      l5: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
