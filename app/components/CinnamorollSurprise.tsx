// app/components/CinnamorollSurprise.tsx
"use client";
import { useState, useEffect } from "react";

export default function CinnamorollSurprise() {
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (isRunning) {
      // 因為加咗飄浮，可以畀佢飛耐少少，改做 8 秒
      const timer = setTimeout(() => setIsRunning(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [isRunning]);

  // 隨機生成 20 隻玉桂狗嘅參數
  const dogs = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    top: Math.random() * 80 + 5 + "%", // 隨機高度 (5% - 85%)
    runDuration: Math.random() * 4 + 4 + "s", // 飛過畫面嘅時間 (4 - 8秒，慢少少睇得清楚啲)
    delay: Math.random() * 3 + "s", // 延遲起步時間
    size: Math.random() * 60 + 80 + "px", // 隨機大細 (80px - 140px，因為坐雲可以大隻啲)
    floatDuration: Math.random() * 1 + 1.5 + "s", // 上下飄浮嘅速度 (1.5 - 2.5秒)
  }));

  return (
    <>
      <button
        onClick={() => setIsRunning(true)}
        className="w-full flex justify-center items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-xl font-bold text-[13px] sm:text-sm transition shadow-sm shadow-blue-500/30 whitespace-nowrap shrink-0"
      >
        <span className="text-base leading-none">☁️</span> 召喚玉桂狗
      </button>

      {isRunning && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {dogs.map((dog) => (
            // 外層 Div 負責「由左飛到右」
            <div
              key={dog.id}
              className="absolute dog-run"
              style={{
                top: dog.top,
                left: "-200px",
                animationDuration: dog.runDuration,
                animationDelay: dog.delay,
              }}
            >
              {/* 內層 Img 負責「上下飄浮」 */}
              <img
                src="/cinnamoroll.png" // 用返你呢張靜態 PNG
                alt="Cinnamoroll on cloud"
                className="dog-float"
                style={{
                  width: dog.size,
                  height: "auto",
                  animationDuration: dog.floatDuration,
                }}
              />
            </div>
          ))}

          <style
            dangerouslySetInnerHTML={{
              __html: `
            /* 由左飛到右嘅動畫 */
            @keyframes runAcrossScreen {
              0% { transform: translateX(0); }
              100% { transform: translateX(120vw); }
            }
            .dog-run {
              animation-name: runAcrossScreen;
              animation-timing-function: linear;
              animation-fill-mode: forwards;
            }

            /* 上下飄浮嘅雲朵動畫 */
            @keyframes floatCloud {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-15px); }
            }
            .dog-float {
              animation-name: floatCloud;
              animation-timing-function: ease-in-out;
              animation-iteration-count: infinite;
            }
          `,
            }}
          />
        </div>
      )}
    </>
  );
}
