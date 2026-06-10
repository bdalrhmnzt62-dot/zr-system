export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="relative grid h-9 w-9 place-items-center rounded-xl gradient-primary shadow-elegant">
        <span className="text-base font-black tracking-tight text-primary-foreground">ZR</span>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-base font-extrabold tracking-tight">ZR System</span>
        <span className="text-[10px] text-muted-foreground">إدارة ورش السيارات</span>
      </div>
    </div>
  );
}
