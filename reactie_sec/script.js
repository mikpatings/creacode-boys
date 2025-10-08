// GSAP entry animation
gsap.from(".card", {
    y: 20,
    opacity: 0,
    duration: 0.6,
    stagger: 0.1,
    ease: "power2.out"
});

// Comment submission (fake)
const input = document.getElementById('commentInput');
const sendBtn = document.getElementById('sendBtn');
const content = document.getElementById('content-area');

sendBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) return;
    const comment = document.createElement('div');
    comment.className = 'card border-b border-slate-100 pb-4 bg-slate-50 p-3 rounded-xl';
    comment.innerHTML = `
    <p class="text-sm text-gray-800">${text}</p>
    <div class="flex items-center mt-3 space-x-2">
        <img src="https://i.pravatar.cc/40?img=12" class="w-6 h-6 rounded-full">
        <span class="text-xs font-medium text-gray-600">You</span>
    </div>
    `;
    content.appendChild(comment);
    input.value = '';
    gsap.from(comment, { opacity: 0, y: 20, duration: 0.4, ease: "power2.out" });
    content.scrollTop = content.scrollHeight;
});