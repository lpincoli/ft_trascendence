import { randomBytes } from 'crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as bcrypt from 'bcrypt';
import { Tokens } from './types';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService, private jwtService: JwtService) { }

    async signupLocal(dto: AuthDto): Promise<Tokens> {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            throw new ConflictException('Email already in use');
        }
        const existingUsername = await this.prisma.user.findUnique({
            where: { username: dto.username },
        });
        if (existingUsername) {
            throw new ConflictException('Username already in use');
        }
        const hash = await this.hashData(dto.password);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                hash,
                username: dto.username,
            },
        });
        await this.prisma.user.update({
            where: { id: user.id },
            data: { isOnline: true },
        });
        const tokens = await this.getTokens(user.id, user.email);
        await this.updateRtHash(user.id, tokens.refreshToken);
        return tokens;
    }

    async signinLocal(dto: AuthDto): Promise<Tokens> {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user) {
            throw new Error('Credentials are not valid');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.hash);
        if (!isPasswordValid) {
            throw new Error('Credentials are not valid');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { isOnline: true },
        });
        const tokens = await this.getTokens(user.id, user.email);
        await this.updateRtHash(user.id, tokens.refreshToken);
        return tokens;
    }

    async signin42(profile: any): Promise<Tokens> {
        let user = await this.prisma.user.findUnique({
            where: { email: profile.email },
        });

        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    email: profile.email,
                    hash: this.generateRandomPassword(),
                    username: profile.username,
                    profilePicture: profile.avatar,
                },
            });
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { isOnline: true },
        });
        console.log(profile);
        const tokens = await this.getTokens(user.id, user.email);
        await this.updateRtHash(user.id, tokens.refreshToken);
        return tokens;
    }

    async logout(userId: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                hashedRt: null,
                isOnline: false
            },
        });
    }
    async refreshTokens(userId: string, rt: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || !user.hashedRt) {
            throw new Error('Access Denied');
        }
        const isRtValid = await bcrypt.compare(rt, user.hashedRt);
        if (!isRtValid) {
            throw new Error('Access Denied');
        }
        const tokens = await this.getTokens(user.id, user.email);
        await this.updateRtHash(user.id, tokens.refreshToken);
        return tokens;
    }

    hashData(data: string) {
        return bcrypt.hash(data, 10);
    }
    async updateRtHash(userId: string, rt: string) {
        const hash = await this.hashData(rt);
        await this.prisma.user.update({
            where: { id: userId },
            data: { hashedRt: hash },
        });
    }

    async getTokens(userId: string, email: string) {
        const atSecret = process.env.AT_SECRET;
        const rtSecret = process.env.RT_SECRET;
        const accessToken = await this.jwtService.signAsync({ id: userId, email }, { secret: atSecret, expiresIn: '15m' });
        const refreshToken = await this.jwtService.signAsync({ id: userId, email }, { secret: rtSecret, expiresIn: '7d' });
        return { accessToken, refreshToken };
    }

    generateRandomPassword(length: number = 16): string {
        return randomBytes(length).toString('hex');
    }
}
