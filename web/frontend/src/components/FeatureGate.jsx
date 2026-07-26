export default function FeatureGate({ enabled, children }) {
  if (!enabled) return null;
  return children;
}
