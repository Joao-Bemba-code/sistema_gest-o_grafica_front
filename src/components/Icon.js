export default function Icon({ name, className = "", fill, weight, grade, size, ...props }) {
  const style = { ...props.style };
  const hasVariation = fill !== undefined || weight !== undefined || grade !== undefined || size !== undefined;
  if (hasVariation) {
    style.fontVariationSettings = `'FILL' ${fill ? 1 : 0}, 'wght' ${weight ?? 400}, 'GRAD' ${grade ?? 0}`;
    if (size !== undefined) style.fontSize = size;
  }
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      {...props}
      style={style}
    >
      {name}
    </span>
  );
}
