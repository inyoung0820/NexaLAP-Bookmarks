# NexaLAP-Bookmarks
NexaLAP Studio에서 Bookmark 기능을 제공합니다.

## 개발 (VS Code)
- 의존성 설치: `npm install`
- 빌드: `npm run compile`
- 패키징(VSIX): `npm run package`

VS Code에서 테스트하려면 VS Code에서 이 폴더를 열고 `F5`로 Extension Development Host를 실행하세요.

## NexaLAP Studio(Theia)에서의 사용 (옵션 A)
이 확장은 **VS Code Extension API 기반**으로 동작하며, NexaLAP Studio(Theia)에서는 VS Code extension 호스트(플러그인)로 로딩되는 구성을 전제로 합니다.

NexaLAP Studio 전용(react widget/monaco 기반) 편집기는 **NexaLAP Studio 쪽 Theia 확장**에서 제공하고,
이 확장은 커맨드/데이터(북마크 목록, 열기 등)를 제공하는 역할로 두는 구성이 가장 안정적입니다.
