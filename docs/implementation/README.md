# Floqi 구현 문서 아카이브

이 디렉토리는 Floqi 프로젝트의 스프린트별 구현 문서를 보관합니다.

## 문서 목적

각 스프린트 완료 후:
- 구현된 모든 컴포넌트의 상세 설명
- 주요 아키텍처 결정 사항 및 근거
- 구현 로직 상세 설명 (**한글**)
- 테스트 결과 종합
- 알려진 이슈 및 기술 부채 추적

## 문서 작성 규칙

1. **파일명**: `sprint-{N}-implementation.md` (예: `sprint-1-implementation.md`)
2. **템플릿**: `TEMPLATE.md` 참고
3. **언어**: 구현 로직 및 설명은 **반드시 한글**로 작성
4. **상세도**: 다른 개발자가 문서만 보고 이해할 수 있을 정도
5. **테스트 결과**: 모든 테스트 케이스 실행 결과 포함

## 스프린트별 문서

| Sprint | 파일 | 상태 | 완료일 |
|--------|------|------|--------|
| Sprint 1 | `sprint-1-implementation.md` | 🔲 예정 | - |
| Sprint 2 | `sprint-2-implementation.md` | 🔲 예정 | - |
| Sprint 3 | `sprint-3-implementation.md` | 🔲 예정 | - |
| Sprint 4 | `sprint-4-implementation.md` | 🔲 예정 | - |
| Sprint 5 | `sprint-5-implementation.md` | 🔲 예정 | - |
| Sprint 6 | `sprint-6-implementation.md` | 🔲 예정 | - |

## 문서 작성 프로세스

```
Sprint 완료
  → Orchestrator가 팀원 구현 내용 취합
  → 컴포넌트별 구현 로직 한글 작성
  → 아키텍처 결정 문서화
  → 테스트 결과 종합
  → docs/implementation/sprint-{N}-implementation.md 생성
  → 사용자에게 리뷰 요청
  → 피드백 반영
  → 다음 스프린트 진행
```

## 리뷰 체크리스트

매 스프린트 종료 후 사용자는 다음을 확인:

- [ ] 모든 User Stories 완료
- [ ] 테스트 케이스 Pass 확인
- [ ] 구현 로직 명확성
- [ ] 아키텍처 결정 합리성
- [ ] 보안 요구사항 충족
- [ ] 기술 부채 관리 수준

## 참고

- 전체 프로젝트 가이드: `../CLAUDE.md`
- User Stories: `../user-stories.md`
- Test Cases: `../test-cases.md`
- Sprint Backlog: `../sprint-backlog.md`
