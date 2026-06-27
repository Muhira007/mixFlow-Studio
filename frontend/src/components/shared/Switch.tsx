'use client';

type SwitchProps = {
  checked: boolean;
  onChange: () => void;
};

export function Switch({ checked, onChange }: SwitchProps) {
  return (
    <div
      onClick={onChange}
      className={`w-11 h-6 rounded-xl relative cursor-pointer transition-all duration-200 shrink-0 ${checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-200 ${checked ? 'left-[22px]' : 'left-0.5'}`}
      />
    </div>
  );
}
