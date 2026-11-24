// ... existing code ...
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 bg-[#181818]/95 backdrop-blur-xl border-t border-neutral-800/90 px-3 sm:px-5 py-2.5 sm:py-3">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
        {/* 좌측: 큰 화면에서도 항상 좌측 사이드바(w-72) 바로 아래에 고정 */}
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-64 lg:w-72 shrink-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 flex items-center justify-center">
// ... existing code ...
        {/* 우측 균형 여백 (PC 중앙 컨트롤 정렬 유지) */}
        <div className="hidden sm:block sm:w-64 lg:w-72 shrink-0" />
      </div>
    </footer>
  )
}
