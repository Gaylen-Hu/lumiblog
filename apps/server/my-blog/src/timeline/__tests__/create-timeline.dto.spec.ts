/**
 * P5：DTO 验证完整性
 * Validates: Requirements 2.8
 *
 * 对任意不满足规则的输入（year 非 4 位数字、字段超长、order 越界），
 * CreateTimelineDto 验证均应失败（返回验证错误）。
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTimelineDto } from '../dto/create-timeline.dto';

/** 构造一个完全合法的 DTO 基础对象 */
function buildValidPayload(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    year: '2024',
    titleZh: '开始编程之旅',
    titleEn: 'Started Programming Journey',
    descZh: '开始学习编程，接触了第一门编程语言',
    descEn: 'Started learning programming and encountered the first language',
    order: 0,
    isVisible: true,
    ...overrides,
  };
}

/** 将普通对象转换为 DTO 实例并执行验证 */
async function validateDto(
  payload: Record<string, unknown>,
): Promise<import('class-validator').ValidationError[]> {
  const dto = plainToInstance(CreateTimelineDto, payload);
  return validate(dto);
}

describe('CreateTimelineDto 验证', () => {
  describe('有效输入 - 应通过验证', () => {
    it('所有字段合法的完整对象应通过验证', async () => {
      // Arrange
      const payload = buildValidPayload();

      // Act
      const errors = await validateDto(payload);

      // Assert
      expect(errors).toHaveLength(0);
    });
  });

  describe('year 字段验证', () => {
    it('year 为纯字母字符串 "abc" 应失败', async () => {
      // Arrange
      const payload = buildValidPayload({ year: 'abc' });

      // Act
      const errors = await validateDto(payload);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const yearError = errors.find((e) => e.property === 'year');
      expect(yearError).toBeDefined();
    });

    it('year 为 5 位数字 "12345" 应失败', async () => {
      // Arrange
      const payload = buildValidPayload({ year: '12345' });

      // Act
      const errors = await validateDto(payload);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const yearError = errors.find((e) => e.property === 'year');
      expect(yearError).toBeDefined();
    });

    it('year 含非数字字符 "20a7" 应失败', async () => {
      // Arrange
      const payload = buildValidPayload({ year: '20a7' });

      // Act
      const errors = await validateDto(payload);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const yearError = errors.find((e) => e.property === 'year');
      expect(yearError).toBeDefined();
    });

    it('year 为空字符串 "" 应失败', async () => {
      // Arrange
      const payload = buildValidPayload({ year: '' });

      // Act
      const errors = await validateDto(payload);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const yearError = errors.find((e) => e.property === 'year');
      expect(yearError).toBeDefined();
    });
  });

  describe('titleZh 字段验证', () => {
    it('titleZh 超过 100 字符应失败', async () => {
      // Arrange
      const payload = buildValidPayload({ titleZh: 'a'.repeat(101) });

      // Act
      const errors = await validateDto(payload);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const fieldError = errors.find((e) => e.property === 'titleZh');
      expect(fieldError).toBeDefined();
    });
  });

  describe('titleEn 字段验证', () => {
    it('titleEn 超过 100 字符应失败', async () => {
      // Arrange
      const payload = buildValidPayload({ titleEn: 'a'.repeat(101) });

      // Act
      const errors = await validateDto(payload);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const fieldError = errors.find((e) => e.property === 'titleEn');
      expect(fieldError).toBeDefined();
    });
  });

  describe('descZh 字段验证', () => {
    it('descZh 超过 500 字符应失败', async () => {
      // Arrange
      const payload = buildValidPayload({ descZh: 'a'.repeat(501) });

      // Act
      const errors = await validateDto(payload);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const fieldError = errors.find((e) => e.property === 'descZh');
      expect(fieldError).toBeDefined();
    });
  });

  describe('descEn 字段验证', () => {
    it('descEn 超过 500 字符应失败', async () => {
      // Arrange
      const payload = buildValidPayload({ descEn: 'a'.repeat(501) });

      // Act
      const errors = await validateDto(payload);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const fieldError = errors.find((e) => e.property === 'descEn');
      expect(fieldError).toBeDefined();
    });
  });

  describe('order 字段验证', () => {
    it('order 为负数 -1 应失败', async () => {
      // Arrange
      const payload = buildValidPayload({ order: -1 });

      // Act
      const errors = await validateDto(payload);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const fieldError = errors.find((e) => e.property === 'order');
      expect(fieldError).toBeDefined();
    });

    it('order 超过 9999（如 10000）应失败', async () => {
      // Arrange
      const payload = buildValidPayload({ order: 10000 });

      // Act
      const errors = await validateDto(payload);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const fieldError = errors.find((e) => e.property === 'order');
      expect(fieldError).toBeDefined();
    });

    it('order 为非整数 1.5 应失败', async () => {
      // Arrange
      const payload = buildValidPayload({ order: 1.5 });

      // Act
      const errors = await validateDto(payload);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const fieldError = errors.find((e) => e.property === 'order');
      expect(fieldError).toBeDefined();
    });
  });

  describe('isVisible 字段验证', () => {
    it('isVisible 为字符串 "true" 应失败', async () => {
      // Arrange
      const payload = buildValidPayload({ isVisible: 'true' });

      // Act
      const errors = await validateDto(payload);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const fieldError = errors.find((e) => e.property === 'isVisible');
      expect(fieldError).toBeDefined();
    });
  });
});
