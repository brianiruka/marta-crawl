// Required fallback for the @panel slot: on any route where nothing is
// intercepted (including hard navigation to "/"), the slot renders nothing.
export default function PanelDefault() {
  return null;
}
