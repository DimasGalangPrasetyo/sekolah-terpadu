<?php

namespace App\Enums;

enum FeeCategory: string
{
    case Monthly = 'monthly';
    case OneTime = 'one_time';
    case Annual = 'annual';
    case Other = 'other';
}
