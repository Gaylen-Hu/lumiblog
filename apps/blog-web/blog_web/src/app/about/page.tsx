export const metadata = {
  title: '关于 - NOVA',
  description: '了解更多关于我的信息。',
};

export default function AboutPage() {
  return (
    <div className="py-12 px-6 md:px-12 lg:px-24 bg-[#F9F9F9] min-h-screen animate-page-fade">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111] mb-8 leading-tight">
              由好奇心驱动，
              <br />
              以<span className="text-blue-600">精准</span>为导向。
            </h2>
            <div className="space-y-6 text-[#555555] leading-relaxed text-lg font-light">
              <p>
                我是一名数字工匠，拥有超过 6
                年的产品构建经验，专注于弥合人类情感与机器逻辑之间的鸿沟。
              </p>
              <p>
                目前，我正在探索 AI
                驱动界面与程序化几何的交叉领域。我的目标是让网络感觉更加物理化、更具响应性、更加生动。
              </p>
              <p>
                当我不在代码编辑器前时，你会发现我在探索山间小径、拍摄粗野主义建筑，或者冲泡一杯完美的手冲咖啡。
              </p>
            </div>

            <div className="mt-12">
              <h4 className="text-[10px] font-bold text-[#111111] uppercase tracking-[0.2em] mb-6">
                技术栈
              </h4>
              <div className="flex flex-wrap gap-3">
                {[
                  'React',
                  'TypeScript',
                  'Next.js',
                  'Node.js',
                  'Tailwind CSS',
                  'NestJS',
                ].map((tech) => (
                  <span
                    key={tech}
                    className="px-4 py-2 bg-white border border-gray-100 rounded-full text-sm font-medium text-gray-600"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="aspect-square rounded-3xl overflow-hidden shadow-sm group">
                <img
                  src="https://picsum.photos/400/400?random=20"
                  alt="Hobby 1"
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                />
              </div>
              <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-sm bg-blue-600 flex items-end p-8 text-white relative group">
                <div className="z-10 relative">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                    兴趣
                  </span>
                  <h4 className="text-2xl font-bold mt-2">建筑</h4>
                </div>
              </div>
            </div>
            <div className="space-y-4 pt-12">
              <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-sm bg-[#111111] p-8 text-white group">
                <div className="h-full flex flex-col justify-between">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform text-2xl">
                    ☕️
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-40">
                      日常
                    </span>
                    <h4 className="text-2xl font-bold mt-2">晨间咖啡</h4>
                  </div>
                </div>
              </div>
              <div className="aspect-square rounded-3xl overflow-hidden shadow-sm group">
                <img
                  src="https://picsum.photos/400/400?random=22"
                  alt="Hobby 2"
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
